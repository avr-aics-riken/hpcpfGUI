
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
		local bootsh = v.path .. 'boot.sh'
		print('write: '.. bootsh)
		local f = io.open(bootsh, "w")
		if f == nil then
			print('faild write:' .. bootsh)
		else
			local str = self.m_targetconf.bootsh;
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
	print(placenum);
	local name = string.sub(str, 0, placenum-1):reverse()
	local dirpath = string.sub(str, placenum):reverse()
	return dirpath, name
end

function dxjob:SendDir(localdir)
	print('PATH='..localdir)
	local temptar = os.tmpname()..'.tar.gz'
	print('temptar = ' .. temptar)
	local dirpath, casename = getDirAndName(localdir)
	compressFile(casename, temptar, true, '-C '..dirpath) -- compress
	self.m_jobmgr:sendFile(temptar, 'HPCPF_case.tar.gz')        -- send
	self.m_jobmgr:remoteExtractFile('HPCPF_case.tar.gz', true)  -- extract
	self.m_jobmgr:remoteDeleteFile ('HPCPF_case.tar.gz')        -- delete temp file
end

function dxjob:GetDir(remotedir, basedir)
	print('get:'..remotedir)
	local remotetarfile = 'HPCPF_case.tar.gz'
	self.m_jobmgr:remoteCompressFile(remotedir, remotetarfile, true)
	local temptar = os.tmpname()..'.tar.gz'
	print('temptar = ' .. temptar)
	self.m_jobmgr:getFile(temptar, remotetarfile)        -- get
	
	--local dirpath, casename = getDirAndName(localdir)
	extractFile(temptar, true, '-C '..basedir) -- compress
	self.m_jobmgr:remoteDeleteFile (remotetarfile) -- delete temp file
	deleteFile(temptar)
end


function dxjob:SubmitAndWait(remoteCasePath)
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