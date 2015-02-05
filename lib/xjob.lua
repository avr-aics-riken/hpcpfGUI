
--- SCP commands

function uploadFile(conf, localfile, remotefile)
    if (not remotefile) then remotefile = "./" end
    --local scpcmd = 'scp -i '.. conf.sshkey .. ' ' .. localfile .. ' ' .. conf.user ..'@'.. conf.server .. ':' .. remotefile;
    local scpcmd = 'scp ';
    if conf.sshkey ~= nil then
        scpcmd = scpcmd .. '-i '.. conf.sshkey .. ' ';
    end
    if conf.port ~= nil then
        scpcmd = scpcmd .. '-P '.. conf.port .. ' ';
    end
    scpcmd = scpcmd .. localfile .. ' ';
    if conf.user ~= nil then
        scpcmd = scpcmd .. conf.user ..'@';
    end
    scpcmd = scpcmd .. conf.server .. ':' .. remotefile;
    --print('CMD>' .. scpcmd)
    local handle = io.popen(scpcmd)
    local result = handle:read("*a")
    --print('OUT>' .. result)
    handle:close()
    return result
end

function downloadFile(conf, remotefile, localfile)
    if (not localfile) then localfile = "./" end
    --local scpcmd = 'scp -i '.. conf.sshkey .. ' ' .. conf.user ..'@'.. conf.server .. ':' .. remotefile ..  ' ' .. localfile;
    local scpcmd = 'scp ';
    if conf.sshkey ~= nil then
        scpcmd = scpcmd .. '-i '.. conf.sshkey .. ' ';
    end
    if conf.port ~= nil then
        scpcmd = scpcmd .. '-P '.. conf.port .. ' ';
    end
    if conf.user ~= nil then
        scpcmd = scpcmd .. conf.user ..'@';
    end
    scpcmd = scpcmd .. conf.server .. ':' .. remotefile .. ' ' .. localfile;
    --print('CMD>' .. scpcmd)
    local handle = io.popen(scpcmd)
    local result = handle:read("*a")
    --print('OUT>' .. result)
    handle:close()
    return result
end


--- Remote(ssh) commands

local function sshCmd(user, server, port, key, cmd, disableErr)
	local nullDev = '/dev/null'
	if (getPlatform() == 'Windows') then
		disableErr = false
	end
    --local sshcmd = 'ssh -i '.. key .. ' ' .. user ..'@'.. server .. ' "' .. cmd ..'"' .. (disableErr and (' 2>'..nullDev) or '')
    local sshcmd = 'ssh ';
    if key ~= nil then
        sshcmd = sshcmd .. '-i '.. key .. ' ';
    end
    if port ~= nil then
        sshcmd = sshcmd .. '-p '.. port .. ' ';
    end
    if user ~= nil then
        sshcmd = sshcmd .. user ..'@';
    end
    sshcmd = sshcmd .. server .. ' "' .. cmd ..'"' .. (disableErr and (' 2>'..nullDev) or '')
	--print('CMD>' .. sshcmd)
    local handle = io.popen(sshcmd)
    local result = handle:read("*a")
    --print('OUT>' .. result)
    handle:close()
    return result
end

function remoteExtractFile(conf, filepath, varbose)
    local option = verbose and 'xvf' or 'xf'
    local cmd = 'tar ' .. option .. ' ' .. filepath
    return sshCmd(conf.user, conf.server, conf.port, conf.sshkey, cmd)
end

function remoteCompressFile(conf, srcfile, tarfile, verbose)
    local option = verbose and 'czvf' or 'czf'
    local cmd = 'tar ' .. option .. ' ' .. tarfile .. ' ' .. srcfile
    return sshCmd(conf.user, conf.server, conf.port, conf.sshkey, cmd)
end

function remoteDeleteFile(conf, filename)
	-- TODO
	print('not implemented yet!')
end

function remoteMoveFile(conf, fromFile, toFile)
	-- TODO
	print('not implemented yet!')
end

function remoteCopyFile(conf, fromFile, toFile)
	-- TODO
	print('not implemented yet!')
end

function remoteMakeDir(conf, dirpath)
	-- TODO
	print('not implemented yet!')
end

function remoteDeleteDir(conf, dirname)
	-- TODO
	print('not implemented yet!')
end


local function split(str, delim)
    local result,pat,lastPos = {},"(.-)" .. delim .. "()",1
    for part, pos in string.gmatch(str, pat) do
    	--print(pos, part)
        table.insert(result, part); lastPos = pos
    end
    table.insert(result, string.sub(str, lastPos))
    return result
end

local function statSplit(res)
    local t = split(res, '\n')
    local statTable = {}
    for i,v in pairs(t) do
    	local ss = string.gmatch(v,"[^%s]+")
		local statColumn = {}
		for k in ss do
			statColumn[#statColumn + 1] = k;
		end
		statTable[#statTable+1] = statColumn
    end
    return statTable
end


local function parseJobID(conf, cmdret)
	local t = split(cmdret, ' ')
    return t[conf.submitIDRow]
end

local function parseJobStat(conf, cmdret, jobid)
	local t = statSplit(cmdret)
	--[[
	print('===============')
	for i,j in pairs(t) do
		io.write(i .. ',')
		for k,w in pairs(j) do
			io.write(k .. ':　' .. w .. ' ')
		end
		io.write('\n')
	end
	print('===============')
	--]]
	if (t[1][1] == 'Invalid' and t[1][2] == 'job') then -- END 
		return 'END'
	end
	
	if (#t >= conf.statStateColumn and #(t[conf.statStateColumn]) >= conf.statStateRow) then
		return t[conf.statStateColumn][conf.statStateRow];
	else
		return 'END' -- not found job
	end
end

function remoteJobSubmit(conf, jobdata)
    local cmdTarget = 'cd ' .. jobdata.targetpath ..';'
    local cmdSubmit = cmdTarget ..  conf.submitCmd .. ' ' .. jobdata.job
	--print(cmdSubmit)
    local cmdret = sshCmd(conf.user, conf.server, conf.port, conf.sshkey, cmdSubmit, true)
    local jobid = parseJobID(conf, cmdret)
    jobdata.id = jobid
    --print('JOB ID = '.. jobid)
    return jobid
end

function remoteJobDel(conf, jobdata)
	if (not jobdata.id) then
		print('[Error] job id is invalid')
		return
	end
    local cmdDel = conf.delCmd .. ' ' .. jobdata.id
	--print(cmdDel)
    local cmdret  = sshCmd(conf.user, conf.server, conf.port, conf.sshkey, cmdDel, true)
end

function remoteJobStat(conf, jobdata)
    local cmdStat = conf.statCmd .. ' ' .. (jobdata.id and jobdata.id or '')
	--print(cmdStat)
    local cmdret  = sshCmd(conf.user, conf.server, conf.port, conf.sshkey, cmdStat, true)
    local jobstat = parseJobStat(conf, cmdret, jobdata.id)
	--print('JOB ST = ' .. jobstat)
    return jobstat
end

