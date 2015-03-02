
local dxjob = {}
local cxjob = require('cxjob')


function dxjob.new(targetConf)
    if type(targetConf) ~= 'table' then
       print('[Error] failed dxjob new')
       return
    end

    local inst = {
    	m_jobque    = {}, -- job queue
		m_submitque = {}, -- submitting job
		m_doneque   = {}, -- ended job
		m_maxsubmitnum = 5,
		m_targetconf = targetConf,
		m_jobstartdate = "",
    }
    inst.m_jobmgr = cxjob.new(targetConf)

    setmetatable(inst, {__index = dxjob})
    return inst;
end

function dxjob:SetMaxSubmit(num)
    self.m_maxsubmitnum = num
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
			print('faild write:' .. bootsh)
		else
			local str = self.m_jobmgr:getBootSh() --self.m_targetconf.bootsh;
			-- replace template
			str = str:gsub("JOB.NODE", v.node)
			str = str:gsub("JOB.CORE", v.core)
			str = str:gsub("JOB.NAME", v.name)
			str = str:gsub("JOB.JOB", v.job)
			print(str)
			f:write(str)
			f:close()
		end
	end
end


function getDirAndName(fullpath)
	local str = string.reverse(fullpath)
	local placenum = string.find(str, "/")
	if placenum == nil then
		placenum = string.find(str, "\\")
	end
	if placenum == fullpath:len() then
		str = string.sub(str, 0, placenum - 1)
		placenum = string.find(str, "/")
		if placenum == nil then
			placenum = string.find(str, "\\")
		end		
	end
	local name = string.sub(str, 0, placenum-1):reverse()
	local dirpath = string.sub(str, placenum):reverse()
	return dirpath, name
end

--[[
function getJobCaseName(casename)
	return casename .. os.date("_%Y%m%d_%H%M%S")
end
--]]

function getRelativeCasePath()
	local p = getBasePath()
	if (p == "") then
		local uppath
		local casename
		local caseDir = getCurrentDir()
		uppath, casename = getDirAndName(caseDir)
		return casename
	else
		local projDir = getCurrentDir()
		local uppath
		local projname
		uppath, projname = getDirAndName(projDir)
		return projname .. p
	end
end

function gettempTarFile()
	if getPlatform() == 'Windows' then
		return '..' .. os.tmpname() .. 'tar.gz'
	else
		return os.tmpname() .. '.tar.gz'
	end
end

function dxjob:SendDir(localdir)
	print('PATH='..localdir)
	local temptar = gettempTarFile()
	print('temptar = ' .. temptar)
	local dirpath, casename = getDirAndName(localdir)
	compressFile(casename, temptar, true, '-C '..dirpath) -- compress
	self.m_jobmgr:sendFile(temptar, 'HPCPF_case.tar.gz')        -- send
	deleteFile(temptar)                                         -- delete localtar file
	self.m_jobmgr:remoteExtractFile('HPCPF_case.tar.gz', true)  -- extract
	self.m_jobmgr:remoteDeleteFile ('HPCPF_case.tar.gz')        -- delete temp file
end

function dxjob:GetDir(remotedir, basedir)
	print('get:'..remotedir)
	local remotetarfile = 'HPCPF_case.tar.gz'
	--self.m_jobmgr:remoteCompressFile(remotedir, remotetarfile, true)
	local newdate = self.m_jobstartdate
	
	-- TODO: newer date
	print('NEWDATE:',newdate)
	if newdate == '' then
		self.m_jobmgr:remoteCompressFile(remotedir, remotetarfile, true)
	else
		self.m_jobmgr:remoteCompressNewerFile(remotedir, remotetarfile, newdate, true)
	end
	local temptar = gettempTarFile()
	print('temptar = ' .. temptar)
	self.m_jobmgr:getFile(temptar, remotetarfile)        -- get
	
	--local dirpath, casename = getDirAndName(localdir)
	extractFile(temptar, true, '-C '..basedir) -- compress
	self.m_jobmgr:remoteDeleteFile (remotetarfile) -- delete temp file
	deleteFile(temptar)
end


function dxjob:SubmitAndWait(remoteCasePath)
	self.m_jobstartdate = os.date('20%y-%m-%d %H:%M:%S')
    while #self.m_jobque > 0 or #self.m_submitque > 0 do
        -- check ended job
		for i = #self.m_submitque, 1, -1 do
		    local v = self.m_submitque[i]
		    if self.m_jobmgr:remoteJobStat(v) == 'END' then
		        self.m_doneque[#self.m_doneque + 1] = v
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
	end
end

return dxjob