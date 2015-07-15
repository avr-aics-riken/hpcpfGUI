
--[[
    USAGE:
    local cxjob = require('cxjob')

    local jobmgr = cxjob.new(
          'username',
          'to_sshkey_path',
          'server_address',
	  'port_number')

      or

    local jobmgr = cxjob.new(
          {username = 'username',
           sshkey   = 'to_sshkey_path',
           server   = 'server_address',
	   port     = 'port_number'})
--]]

local cxjob = {}

local envconf = require('envconf')
if envconf == nil then
    print("[Error] Can't load envconf.lua")
    return nil
end
    
local function getServerInfo(server)
    local si = envconf.getServerInfo(server)
    if (si == nil) then
        print("[Error] Can't find ServerInfo:", server)
    end
    return si
end


function cxjob.new(username_or_table, sshkey, server, port, workdir)
    local username
    if type(username_or_table) == 'table' then
        username = username_or_table.user
        sshkey   = username_or_table.sshkey
        server   = username_or_table.server
        port     = username_or_table.port
        workdir  = username_or_table.workpath
		password = username_or_table.password
    else
        username = username_or_table -- this is username.
    end

    local inst = {
        user   = username,
        sshkey = sshkey,
        server = server,
        port   = port,
        workdir = workdir,
		password = password
    }
    if inst.workdir == nil then
        inst.workdir = ""
    else
        if string.sub(inst.workdir, inst.workdir:len()) ~= '/' then
            inst.workdir = inst.workdir .. '/'
        end
    end

    inst.jobinfo = getServerInfo(server)

    if (inst.jobinfo ~= nil and inst.jobinfo.server ~= nil) then
        print('OVERRIDE:',inst.jobinfo.server)
        inst.server = inst.jobinfo.server -- override
    end

    setmetatable(inst, {__index = cxjob})

    -- remote directory generation
    inst:remoteMakeDir(inst.workdir)
    

    -- auto generate date folder(to be DELETE)
    --[[
    inst.workdir = inst.workdir ..  os.date("hpcpfJob_%Y%m%d_%H%M%S/")
    print('REMOTE WORKDIR=', inst.workdir)
    inst:remoteMakeDir(inst.workdir)
    --]]
    return inst;
end

function cxjob:getBootSh()
    return self.jobinfo.bootsh;
end

function cxjob:uploadFile(localfile, remotefile)
    if (not remotefile) then remotefile = "./" end
    --local scpcmd = 'scp -i '.. self.sshkey .. ' ' .. localfile .. ' ' .. self.user ..'@'.. self.server .. ':' .. self.workdir .. remotefile;
    local scpcmd = 'scp ';
    if self.sshkey ~= nil then
        scpcmd = scpcmd .. '-i '.. self.sshkey .. ' ';
    end
    if self.port ~= nil then
        scpcmd = scpcmd .. '-P '.. self.port .. ' ';
    end
    scpcmd = scpcmd .. localfile .. ' ';
    if self.user ~= nil then
        scpcmd = scpcmd .. self.user ..'@';
    end
    scpcmd = scpcmd .. self.server .. ':' .. self.workdir .. remotefile;
    print('CMD>' .. scpcmd)
    local handle = io.popen(scpcmd)
    local result = handle:read("*a")
    print('OUT>' .. result)
    handle:close()
    return result
end

function cxjob:downloadFile(remotefile, localfile)
    if (not localfile) then localfile = "./" end
    --local scpcmd = 'scp -i '.. self.sshkey .. ' ' .. self.user ..'@'.. self.server .. ':' .. self.workdir .. remotefile ..  ' ' .. localfile;
    local scpcmd = 'scp ';
    if self.sshkey ~= nil then
        scpcmd = scpcmd .. '-i '.. self.sshkey .. ' ';
    end
    if self.port ~= nil then
        scpcmd = scpcmd .. '-P '.. self.port .. ' ';
    end
    if self.user ~= nil then
        scpcmd = scpcmd .. self.user ..'@';
    end
    scpcmd = scpcmd .. self.server .. ':' .. self.workdir .. remotefile .. ' ' .. localfile;
    print('CMD>' .. scpcmd)
    local handle = io.popen(scpcmd)
    local result = handle:read("*a")
    print('OUT>' .. result)
    handle:close()
    return result
end


--- Remote(ssh) commands
local function scpCmd(user, server, port, key, password, fromfile, tofile)
    --local scpcmd = 'scp  -i '.. key .. ' ' .. fromfile .. ' ' .. tofile
    local scpcmd = 'scp ';
    if key ~= nil then
        scpcmd = scpcmd .. '-i '.. key .. ' ';
    end
    if port ~= nil then
        scpcmd = scpcmd .. '-P '.. port .. ' ';
    end
    scpcmd = scpcmd .. fromfile .. ' ' .. tofile;
    print(scpcmd)
    local handle;
    local result;
	if password ~= nil then
		sshcmd = 'node /Users/khatta/Documents/digirea/hpcpf_digirea/app/ssh.js "' .. scpcmd .. '"' .. (disableErr and (' 2>'..nullDev) or '')
		print('CMD>' .. sshcmd)
    	handle = io.popen(sshcmd)
		result = handle:read("*a")
		print('OUT>' .. result)
	else
		handle = io.popen(scpcmd)
		result = handle:read("*a")
	end
	
    print(result)
    handle:close()
    return result
end


local function sshCmd(user, server, port, key, password, cmd, disableErr)
    local nullDev = '/dev/null'
    if (getPlatform() == 'Windows') then
        disableErr = nil
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
	local handle;
	local result;
	if password ~= nil then
		sshcmd = 'node /Users/khatta/Documents/digirea/hpcpf_digirea/app/ssh.js "' .. cmd .. '"' .. (disableErr and (' 2>'..nullDev) or '')
		print('CMD>' .. sshcmd)
    	handle = io.popen(sshcmd)
		result = handle:read("*a")
		print('OUT>' .. result)
		
	else
		sshcmd = sshcmd .. server .. ' "' .. cmd ..'"' .. (disableErr and (' 2>'..nullDev) or '')
		print('CMD>' .. sshcmd)
    	handle = io.popen(sshcmd)
		result = handle:read("*a")
		print('OUT>' .. result)
	end
    handle:close()
    return result
end

function cxjob:remoteExtractFile(filepath, verbose)
    local option = (verbose == true) and '-xvf' or '-xf'
    local cmd = 'cd ' .. self.workdir .. ';tar ' .. option .. ' ' .. filepath
    print(cmd)
    return sshCmd(self.user, self.server, self.port, self.sshkey, self.password, cmd)
end

function cxjob:remoteCompressNewerFile(srcfile, tarfile, newdate, verbose)
    local newer =  '--newer \\"' .. newdate .. '\\" '
    local option = (verbose == true) and '-czvf' or '-czf'
    option = newer .. option
    local cmd = 'cd ' .. self.workdir .. ';tar ' .. option .. ' ' .. tarfile .. ' ' .. srcfile
    print(cmd)
    return sshCmd(self.user, self.server, self.port, self.sshkey, self.password, cmd)
end

function cxjob:remoteCompressFile(srcfile, tarfile, verbose)
    local option = (verbose == true) and '-czvf' or '-czf'
    local cmd = 'cd ' .. self.workdir .. ';tar ' .. option .. ' ' .. tarfile .. ' ' .. srcfile
    print(cmd)
    return sshCmd(self.user, self.server, self.port, self.sshkey, self.password, cmd)
end

function cxjob:sendFile(localfile, remotefile)
    local fromfile = localfile
    --local tofile = self.user .. '@' .. self.server .. ':' .. self.workdir .. remotefile
    local tofile = self.server .. ':' .. self.workdir .. remotefile
    if self.user ~= nil then
        tofile = self.user .. '@' .. tofile;
    end
    return scpCmd(self.user, self.server, self.port, self.sshkey, self.password, fromfile, tofile)
end

function cxjob:getFile(localfile, remotefile)
    --local fromfile = self.user .. '@' .. self.server .. ':' .. self.workdir .. remotefile
    local fromfile = self.server .. ':' .. self.workdir .. remotefile
    if self.user ~= nil then
        fromfile = self.user .. '@' .. fromfile;
    end
    local tofile = localfile
    return scpCmd(self.user, self.server, self.port, self.sshkey, self.password, fromfile, tofile)
end


function cxjob:remoteDeleteFile(filename)
    local cmd = 'rm -f ' .. self.workdir .. filename
    return sshCmd(self.user, self.server, self.port, self.sshkey, self.password, cmd)
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
    local cmd = 'mkdir -p ' .. dirpath
    return sshCmd(self.user, self.server, self.port, self.sshkey, self.password, cmd)
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
    local cmdTarget = 'cd ' .. self.workdir .. jobpath .. '/' .. jobdata.path ..';'
    local cmdSubmit = cmdTarget ..  self.jobinfo.submitCmd .. ' ' .. jobsh
    print(cmdSubmit)
    local cmdret = sshCmd(self.user, self.server, self.port, self.sshkey, self.password, cmdSubmit, true)
    local jobid = parseJobID(self.jobinfo, cmdret)
    jobdata.id = jobid
    --print('JOB ID = '.. jobid)
    return jobid
end

function cxjob:remoteJobDel(jobdata)
    if self.jobinfo.delCmd == nil then
        -- nothing to do
        return
    end
    if jobdata == nil or jobdata.id == nil then
        errorlog('[Error] job or job.id is invalid (remoteJobDel)')
        debug.traceback()
        return
    end
    local cmdDel = self.jobinfo.delCmd .. ' ' .. jobdata.id
    --print(cmdDel)
    local cmdret  = sshCmd(self.user, self.server, self.port, self.sshkey, self.password, cmdDel, true)
end

function cxjob:remoteJobStat(jobdata)
    if self.jobinfo.statCmd == nil then
        -- can't get stat localhost
        return 'END'
    end
    if jobdata == nil or jobdata.id == nil then
        errorlog('[Error] job or job.id is invalid (remoteJobStat)')
        debug.traceback()
        return
    end

    local cmdStat = self.jobinfo.statCmd .. ' ' .. (jobdata.id and jobdata.id or '')
    --print(cmdStat)
    local cmdret  = sshCmd(self.user, self.server, self.port, self.sshkey, self.password, cmdStat, true)
    local jobstat = parseJobStat(self.jobinfo, cmdret, jobdata.id)
    --print('JOB ST = ' .. jobstat)
    return jobstat
end

function cxjob:remoteDate()
    local cmd = 'date \\"+%Y-%m-%d %H:%M:%S\\"'
    print(cmd)
    local dateret = sshCmd(self.user, self.server, self.port, self.sshkey, self.password, cmd)
    dateret = dateret:gsub("\n","");
    print('DATERET:', dateret)
    return dateret
end

function cxjob:isExistFile(remotefile)
    local cmdFile = 'file ' .. self.workdir .. remotefile
    --print(cmdFile)
    local cmdret  = sshCmd(self.user, self.server, self.port, self.sshkey, self.password, cmdFile, true)
    --print(cmdret)
    local fnd = string.find(cmdret, 'No such file or directory')
    --print(fnd)
    if fnd == nil then
        return true
    end
    return false
end

return cxjob

