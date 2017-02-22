local focusSetting = {
    submitCmd = 'sbatch',
    submitIDRow = 4,
    delCmd = 'scancel',
    statCmd = 'fjstat',
    statStateColumn = 5,
    statStateRow = 4,
   jobEndFunc = function (t)
        if (t[1][1] == 'Invalid' and t[1][2] == 'job' and t[1][3] == 'ID') then return true
        else return false end
    end,
    bootsh = [[
#!/bin/bash
#SBATCH -p ye001uta3m
#SBATCH -N JOB.NODE
#SBATCH -n JOB.CORE
#SBATCH -J JOB.NAME
#SBATCH -o stdout.%J.log
#SBATCH -e stderr.%J.log
JOB.OPTION
sh JOB.JOB
]]      
}

local focusTunnelSetting = {
    submitCmd = 'sbatch',
    submitIDRow = 4,
    delCmd = 'scancel',
    statCmd = 'fjstat',
    statStateColumn = 5,
    statStateRow = 4,
    --portForwardingInfo = [[{"host" : "ff01","user": "userid","password": "*****"}]],
    jobEndFunc = function (t)
        if (t[1][1] == 'Invalid' and t[1][2] == 'job' and t[1][3] == 'ID') then return true
        else return false end
    end,
    bootsh = [[
#!/bin/bash
#SBATCH -p ye001uta3m
#SBATCH -N JOB.NODE
#SBATCH -n JOB.CORE
#SBATCH -J JOB.NAME
#SBATCH -o stdout.%J.log
#SBATCH -e stderr.%J.log
JOB.OPTION
sh JOB.JOB
]]      
}

local focusSettingFFV = {
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
    bootsh = [[
#!/bin/bash
#SBATCH -p ye016uta72h
#SBATCH -N JOB.NODE
#SBATCH -n JOB.CORE
#SBATCH -J JOB.NAME
#SBATCH -o stdout.%J.log
#SBATCH -e stderr.%J.log
module load PrgEnv-intel
module load intel/openmpi165
JOB.OPTION
sh JOB.JOB
]]
}

local kSetting = {
    submitCmd = 'pjsub',
    submitIDRow = 6,
    delCmd = 'pjdel',
    statCmd = 'pjstat --choose=jid,st -H day=7',
    statStateColumn = 2,
    statStateRow = 6,
    jobEndFunc = function(t)
      if (t[1][2] == "EXT") then return true
      else  return false end
    end,
    bootsh = [[
#!/bin/sh
#PJM --rsc-list "node=JOB.NODE"
#PJM --mpi "proc=JOB.PROC"
#PJM --rsc-list "rscgrp=micro"
#PJM --rsc-list "elapse=00:28:00"
#PJM -S
export OMP_NUM_THREADS=JOB.THREADS
JOB.OPTION
sh JOB.JOB
]]
}

local localhostSetting = {
    submitCmd = 'sh',
    submitIDRow = 2,
    delCmd = 'kill',
    --	portForwardingInfo = [[
    --{
    --	"host" : "192.168.1.25"
    --}
    --	]],
    --statCmd = 'fjstat',
    --statStateColumn = 5,
    --statStateRow = 4,
    --jobEndFunc = function (t)
    --   if (t[1][1] == 'Invalid' and t[1][2] == 'job' and t[1][3] == 'ID') then return true
    --    else return false end
    --end,
    bootsh = [[
#!/bin/bash
JOB.OPTION
sh JOB.JOB
]]    
}

	

local function getServerInfo(server)
    local info = {
        ["localhost"] = localhostSetting,
        ["k.aics.riken.jp"] = kSetting,
        ["ssh.j-focus.jp"]  = focusTunnelSetting,
        ["ff01.j-focus.jp"] = focusSetting,
        ["ff02.j-focus.jp"] = focusSetting,
        ["ff01"] = focusSetting,
        ["ff02"] = focusSetting,
        ["ff01ffv"] = focusSettingFFV,
    }
    info["ff01ffv"].server = "ff01"
	if info[server] ~= nil then
    	return info[server]
	else
		return localhostSetting
	end
end

return {getServerInfo=getServerInfo}
