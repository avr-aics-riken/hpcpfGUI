
--[[
	USAGE:
	local cxjob = require('cxjob')

	local jobmgr = cxjob.new(
	      'username',
	      'to_sshkey_path',
	      'server_address')

	  or

	local jobmgr = cxjob.new(
	      {username = 'username',
	       sshkey   = 'to_sshkey_path',
	       server   = 'server_address'})
--]]

local cxjob = {}

local function getJobInfo(server)
    local info = {
        ["k.aics.riken.jp"] = {
            submitCmd = 'pjsub',
	    submitIDRow = 6,
            delCmd = 'pjdel',
            statCmd = 'pjstat',
            statStateColumn = 6,
            statStateRow = 4,
            jobEndFunc = function(t)
                -- TODO: 'END'
                return false
            end,
        },
        ["ff01.j-focus.jp"] = {
            submitCmd = 'fjsub',
	    submitIDRow = 4,
            delCmd = 'fjdel',
            statCmd = 'fjstat',
            statStateColumn = 5,
            statStateRow = 4,
            jobEndFunc = function (t)
                if (t[1][1] == 'Invalid' and t[1][2] == 'job' and t[1][3] == 'ID') then return true
                else return false end
            end,
        }
    }
    return info[server]
end


function cxjob.new(username_or_table, sshkey, server)
    local username
    if type(username_or_table) == 'table' then
        username = username_or_table.user
        sshkey   = username_or_table.sshkey
        server   = username_or_table.server
    else
        username = username_or_table -- this is username.
    end

    local inst = {
        user   = username,
        sshkey = sshkey,
        server = server
    }
    inst.jobinfo = getJobInfo(server)
    setmetatable(inst, {__index = cxjob})
    return inst;
end

function cxjob:uploadFile(localfile, remotefile)
    if (not remotefile) then remotefile = "./" end
    local scpcmd = 'scp -i '.. self.sshkey .. ' ' .. localfile .. ' ' .. self.user ..'@'.. self.server .. ':' .. remotefile;
    --print('CMD>' .. scpcmd)
    local handle = io.popen(scpcmd)
    local result = handle:read("*a")
    --print('OUT>' .. result)
    handle:close()
    return result
end

function cxjob:downloadFile(remotefile, localfile)
    if (not localfile) then localfile = "./" end
    local scpcmd = 'scp -i '.. self.sshkey .. ' ' .. self.user ..'@'.. self.server .. ':' .. remotefile ..  ' ' .. localfile;
    --print('CMD>' .. scpcmd)
    local handle = io.popen(scpcmd)
    local result = handle:read("*a")
    --print('OUT>' .. result)
    handle:close()
    return result
end


--- Remote(ssh) commands
local function scpCmd(user, server, key, fromfile, tofile)
    local scpcmd = 'scp -i '.. key .. ' ' .. fromfile .. ' ' .. tofile
    print(scpcmd)
    local handle = io.popen(scpcmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

local function sshCmd(user, server, key, cmd, disableErr)
	local nullDev = '/dev/null'
	if (getPlatform() == 'Windows') then
		disableErr = false
	end
    local sshcmd = 'ssh -i '.. key .. ' ' .. user ..'@'.. server .. ' "' .. cmd ..'"' .. (disableErr and (' 2>'..nullDev) or '')
	--print('CMD>' .. sshcmd)
    local handle = io.popen(sshcmd)
    local result = handle:read("*a")
    --print('OUT>' .. result)
    handle:close()
    return result
end

function cxjob:remoteExtractFile(filepath, varbose)
    local option = verbose and 'xvf' or 'xf'
    local cmd = 'tar ' .. option .. ' ' .. filepath
    return sshCmd(self.user, self.server, self.sshkey, cmd)
end

function cxjob:remoteCompressFile(srcfile, tarfile, verbose)
    local option = verbose and 'czvf' or 'czf'
    local cmd = 'tar ' .. option .. ' ' .. tarfile .. ' ' .. srcfile
    return sshCmd(self.user, self.server, self.sshkey, cmd)
end

function cxjob:sendFile(localfile, remotefile)
    local option = verbose and 'czvf' or 'czf'
    local fromfile = localfile
    local tofile = self.user .. '@' .. self.server .. ':' .. remotefile
    return scpCmd(self.user, self.server, self.sshkey, fromfile, tofile)
end

function cxjob:getFile(localfile, remotefile)
    local option = verbose and 'czvf' or 'czf'
    local fromfile = self.user .. '@' .. self.server .. ':' .. remotefile
    local tofile = localfile
    return scpCmd(self.user, self.server, self.sshkey, fromfile, tofile)
end


function cxjob:remoteDeleteFile(filename)
	local cmd = 'rm -f ' .. filename
    return sshCmd(self.user, self.server, self.sshkey, cmd)
end

function cxjob:remoteMoveFile(fromFile, toFile)
	-- TODO
	print('not implemented yet!')
end

function cxjob:remoteCopyFile(fromFile, toFile)
	-- TODO
	print('not implemented yet!')
end

function cxjob:remoteMakeDir(dirpath)
    local cmd = 'mkdir ' .. dirpath
    return sshCmd(self.user, self.server, self.sshkey, cmd)
end

function cxjob:remoteDeleteDir(dirname)
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
    if conf.jobEndFunc(t) then
	--if (t[1][1] == 'Invalid' and t[1][2] == 'job') then -- END 
		return 'END'
	end
	
	if (#t >= conf.statStateColumn and #(t[conf.statStateColumn]) >= conf.statStateRow) then
		return t[conf.statStateColumn][conf.statStateRow];
	else
		return 'END' -- not found job
	end
end

function cxjob:remoteJobSubmit(jobdata, pathtojob, jobsh)
    local jobpath = pathtojob and pathtojob or ''
	if jobdata == nil then
		print('Invalid argument: remoteJobSubmit')
        debug.traceback()
		return;
	end
    local cmdTarget = 'cd ' .. jobpath .. '/' .. jobdata.path ..';'
    local cmdSubmit = cmdTarget ..  self.jobinfo.submitCmd .. ' ' .. jobsh
    print(cmdSubmit)
    local cmdret = sshCmd(self.user, self.server, self.sshkey, cmdSubmit, true)
    local jobid = parseJobID(self.jobinfo, cmdret)
    jobdata.id = jobid
    --print('JOB ID = '.. jobid)
    return jobid
end

function cxjob:remoteJobDel(jobdata)
	if jobdata == nil or jobdata.id == nil then
    	print('[Error] job or job.id is invalid')
        debug.traceback()
		return
	end
    local cmdDel = self.jobinfo.delCmd .. ' ' .. jobdata.id
	--print(cmdDel)
    local cmdret  = sshCmd(self.user, self.server, self.sshkey, cmdDel, true)
end

function cxjob:remoteJobStat(jobdata)
    if jobdata == nil or jobdata.id == nil then
        print('[Error] job or job.id is invalid')
        debug.traceback()
        return
    end

    local cmdStat = self.jobinfo.statCmd .. ' ' .. (jobdata.id and jobdata.id or '')
	--print(cmdStat)
    local cmdret  = sshCmd(self.user, self.server, self.sshkey, cmdStat, true)
    local jobstat = parseJobStat(self.jobinfo, cmdret, jobdata.id)
	--print('JOB ST = ' .. jobstat)
    return jobstat
end

return cxjob


