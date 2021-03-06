
local dxjob = {}
local cxjob = require('cxjob')

math.randomseed( os.time() )
os.tmpname(); -- for win

local function uuid()
	local random = math.random
    local template ='xxxxxxxx'
    return string.gsub(template, '[xy]', function (c)
        local v = (c == 'x') and random(0, 0xf) or random(8, 0xb)
        return string.format('%x', v)
    end)
end

function dxjob.new(excase)
	local targetConf = excase.targetConf
    if type(targetConf) ~= 'table' then
       errorlog('[Error] failed dxjob new')
       return
    end

    local inst = {
    	m_jobque    = {}, -- job queue
		m_submitque = {}, -- submitting job
		m_doneque   = {}, -- ended job
		m_failedque = {}, -- failed job
		m_maxsubmitnum = 5,
		m_targetconf = targetConf,
		m_jobstartdate = "",
		m_excase = excase
    }
	targetConf.projectdir = excase.projectDir;
	targetConf.authkey = excase.authKey;
	
    inst.m_jobmgr = cxjob.new(targetConf)

    setmetatable(inst, {__index = dxjob})
    return inst;
end

function dxjob:SetMaxSubmit(num)
    self.m_maxsubmitnum = num
    print("DEBUG: m_maxsubmitnum = "..self.m_maxsubmitnum)
end

function dxjob:Cancel()
    for i,v in pairs(self.m_submitque) do
    	self.m_jobmgr:remoteJobDel(v)
    end
    self.m_submitque = {}
    self.m_jobque    = {}
    self.m_doneque   = {}
end

function dxjob:AddJob(job)
    self.m_jobque[#self.m_jobque + 1] = job
end


function dxjob:GenerateBootSh()
	local run = not self.m_excase.isDryRun
	for i,v in pairs(self.m_jobque) do
		print(v.path, v.name, v.job)
		if (v.path == nil) then
			print('[Error] not found job.path')
			return
		end
		
		local placenum = string.find(v.path, "/")
		if placenum == nil then
			placenum = string.find(v.path, "\\")
		end
		if (placenum == nil or placenum ~= v.path:len()) then
			v.path = v.path .. "/"
		end
		
		local bootsh = '.' .. getBasePath() .. '/' .. v.path .. 'boot.sh'
		print('write: ' .. bootsh)
		local f = io.open(bootsh, "wb")
		if f == nil then
			errorlog('faild write:' .. bootsh)
		else
			local str = self.m_jobmgr:getBootSh() --self.m_targetconf.bootsh;
			-- replace template
			str = str:gsub("JOB.NODE", v.nodes)
			str = str:gsub("JOB.PROC", v.procs)
			str = str:gsub("JOB.THRED", v.threads)
			str = str:gsub("JOB.NAME", v.name)
			if v.option ~= nil then
				str = str:gsub("JOB.OPTION", v.option)
			else
				str = str:gsub("JOB.OPTION", '')
			end
			if run == false then
				str = str:gsub("JOB.JOB", '--version')
			else
				str = str:gsub("JOB.JOB", v.job)
			end
			--print('-------\n' .. str .. '-------\n')
			f:write(str)
			f:close()
		end
	end
end

function gettempTarFile()
	if getPlatform() == 'Windows' then
		--return os.getenv('TMP') .. os.tmpname() .. 'tar.gz'
		local tmp = '..' .. os.tmpname() .. '.tar.gz'
		return tmp:gsub('\\', '/')
	else
		return os.tmpname() .. '.tar.gz'
	end
end

function dxjob:SendCaseDir()
	local localdir = self.m_excase.caseDir
	local casename = self.m_excase.caseName
	local projname = self.m_excase.projectName
	print('CASE PATH='..localdir)
	local temptar = gettempTarFile()
	print('temptar = ' .. temptar)
	local remotedir = projname .. '/' .. casename
	local projectdir = self.m_excase.projectDir
	print('PROJECT UP PATH=' .. projectdir)
	local exist = self.m_jobmgr:isExistFile(remotedir)
	if  exist == true then
		print('Already exist case directory:', remotedir);
		
		-- backup directry
		print('Backup old case directory')
		local randomName = uuid()
		local newcasename =  remotedir .. '_BAK' .. randomName
		print('From:', remotedir, 'To:', newcasename)
		self.m_jobmgr:remoteMoveFile(remotedir, newcasename)

		-- DELETE now.
		--print('Delete case directory...')
		--self.m_jobmgr:remoteDeleteDir(remotedir)
	end
	self.m_jobmgr:remoteMakeDir(remotedir)
	
	compressFile(casename, temptar, true, '-C ' .. projectdir) -- compress	
	local tarfilename = projname .. '/HPCPF_case_' .. projname .. '_'.. casename .. '.tar.gz'
	self.m_jobmgr:sendFile(temptar, tarfilename)        -- send
	deleteFile(temptar)                                 -- delete localtar file
	self.m_jobmgr:remoteExtractFile(tarfilename, true, '-C ./' .. projname)  -- extract
	self.m_jobmgr:remoteDeleteFile (tarfilename)        -- delete temp file
	return true
end

function dxjob:getFilesInternal(files, newdate)
	local projuppath = self.m_excase.projectUpDir
	local casename  = self.m_excase.caseName
	local projname  = self.m_excase.projectName
	local remotedir = projname .. '/' .. casename

	local remotetarfile = projname .. '/HPCPF_case_' .. projname .. '_'.. casename .. '.tar.gz'

	if newdate == '' or newdate == nil then
		self.m_jobmgr:remoteCompressFile(files, remotetarfile, true)
	else
		self.m_jobmgr:remoteCompressNewerFile(files, remotetarfile, newdate, true)
	end
	local temptar = gettempTarFile()
	print('temptar = ' .. temptar)
	self.m_jobmgr:getFile(temptar, remotetarfile)   -- get
	
	extractFile(temptar, true, '-C ' .. projuppath) -- compress
	self.m_jobmgr:remoteDeleteFile (remotetarfile)  -- delete temp file
	deleteFile(temptar)
end

function dxjob:GetFiles(filesTable, newdate)
	local casename = self.m_excase.caseName
	local projname  = self.m_excase.projectName

	local files = ''
	for i, v in pairs(filesTable) do
    	files = files .. projname .. '/' .. casename .. '/' .. v .. ' '
	end
	self:getFilesInternal(files, newdate)
end

function dxjob:GetCaseDir()
	local casedir = '*';
	local newdate = self.m_jobstartdate
	
	print('NEWDATE:',newdate)
	self:GetFiles({casedir}, newdate)
end

function dxjob:Command(cmd)
	return self.m_jobmgr:remoteCommand(cmd)
end

function dxjob:SubmitAndWait(poolingFunc, jobCompleteFunc)
	local casename  = self.m_excase.caseName
	local projname  = self.m_excase.projectName
	local remoteCasePath = projname .. '/' .. casename

	--self.m_jobstartdate = os.date('20%y-%m-%d %H:%M:%S')
	self.m_jobstartdate = self.m_jobmgr:remoteDate()
    while #self.m_jobque > 0 or #self.m_submitque > 0 do
        -- check ended job
		for i = #self.m_submitque, 1, -1 do
		    local v = self.m_submitque[i]
            local stat = self.m_jobmgr:remoteJobStat(v)
		    if stat == 'END' then
		        self.m_doneque[#self.m_doneque + 1] = v
				table.remove(self.m_submitque, i)
				if jobCompleteFunc then		        	
					jobCompleteFunc(v)
		        end
            elseif stat == 'FAILED' then
		        self.m_failedque[#self.m_doneque + 1] = v
				table.remove(self.m_submitque, i)
		    end
		    sleep(1) -- wait
		end

	    -- submit new job
		if #self.m_jobque > 0 then
			if #self.m_submitque >= self.m_maxsubmitnum then
				sleep(10)
			else
				local job = self.m_jobque[1]
				table.remove(self.m_jobque, 1)
				self.m_submitque[#self.m_submitque + 1] = job
				self.m_jobmgr:remoteJobSubmit(job, remoteCasePath, 'boot.sh')
			end
		else
			sleep(10)
		end
		print('JOB: QUE='.. #self.m_jobque .. ' / SUBMIT='.. #self.m_submitque .. ' DONE=' .. #self.m_doneque)
		if poolingFunc then
			poolingFunc()
		end
	end
	print('Finished job='.. #self.m_doneque .. ' / Failed job='.. #self.m_failedque)
end

function dxjob:SubmitAndWaitWithCollectionJobFiles()
	local dj = self
	local nowdate = dj:GetRemoteDate()
	dj.m_jobcollectiondate = nowdate
	self:SubmitAndWait(function ()
			dj:GetPollingFiles()
		end,
		function (job)
			local jobname = job.path
			if jobname:sub(jobname:len()) == '/' then
				jobname = jobname:sub(1, jobname:len()-1)
			end
			print('END Job:', jobname)

			local nowdate = dj:GetRemoteDate()
			dj:GetCollectionJobFiles(jobname, dj.m_jobcollectiondate)
			dj.m_jobcollectiondate = nowdate
		end)
end

function dxjob:GetRemoteDate()
	return self.m_jobmgr:remoteDate()
end

function dxjob:IsExistFile(filepath)
	local casename  = self.m_excase.caseName
	local projname  = self.m_excase.projectName
	local remoteCasePath = projname .. '/' .. casename
	return self.m_jobmgr:isExistFile(remoteCasePath .. '/' .. filepath)
end

function dxjob:CollectionFileList()
	return self.m_excase.collectionFiles
end

function dxjob:CollectionJobFileList()
	return self.m_excase.collectionJobFiles
end

function dxjob:PollingFileList()
	return self.m_excase.pollingFiles
end

function dxjob:GetCollectionFiles(newdate)
	local collectfiles = self:CollectionFileList()
    if collectfiles == nil or #collectfiles == 0 then
    	print('[Warning] There is no collectfile.')
    	return
    end
    
    local filesTable = {}
    for i, v in pairs(collectfiles) do
    	if v.path == nil then
	    	print('[Warning] There is no "path" field in collection file list.')
    	else
	        filesTable[#filesTable + 1] = v.path
	    end
    end

    if #filesTable > 0 then
        self:GetFiles(filesTable, newdate)
    end
end

function dxjob:GetPollingFiles(newdate)
	local collectfiles = self:PollingFileList()
    if collectfiles == nil or #collectfiles == 0 then
    	return
    end
    
    local filesTable = {}
    for i, v in pairs(collectfiles) do
    	if v.path == nil then
	    	print('[Warning] There is no "path" field in polling file list.')
    	else
      		filesTable[#filesTable + 1] = v.path
	    end
    end

    if #filesTable > 0 then
        self:GetFiles(filesTable, newdate)
    end
end

function dxjob:GetCollectionJobFiles(jobname, newdate)
	local collectfiles = self:CollectionJobFileList()
    if collectfiles == nil or #collectfiles == 0 then
    	return
    end

    local filesTable = {}
    for i, v in pairs(collectfiles) do
    	if v.path == nil then
	    	print('[Warning] There is no "path" field in collection job file list.')
    	else
    	    filesTable[#filesTable + 1] = jobname .. '/' .. v.path
	    end
    end

    if #filesTable > 0 then
        self:GetFiles(filesTable, newdate)
    end
end

function dxjob:CleanUp()
	if self.m_excase.isDryRun or self.m_excase.cleanup then
		local casename  = self.m_excase.caseName
		local projname  = self.m_excase.projectName

		local remotedir = projname .. '/' .. casename
		local projectdir = self.m_excase.projectDir
		local exist = self.m_jobmgr:isExistFile(remotedir)
		if  exist == true then
			-- DELETE now.
			print('Delete case directory...')
			self.m_jobmgr:remoteDeleteDir(remotedir)
		end
	end
end

return dxjob
