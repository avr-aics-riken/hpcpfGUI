local focusSetting = {
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
#SBATCH -p d024h
#SBATCH -N JOB.NODE
#SBATCH -n JOB.CORE
#SBATCH -J JOB.NAME
#SBATCH -o stdout.%J.log
#SBATCH -e stderr.%J.log
#SBATCH -p ye001uta3m
sh JOB.JOB
]]      
}

local kSetting = {
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
    bootsh = [[echo "TODO:"]]
}

local function getServerInfo(server)
    local info = {
        ["k.aics.riken.jp"] = kSetting,
        ["ff01.j-focus.jp"] = focusSetting,
        ["ff02.j-focus.jp"] = focusSetting,
        ["ff01"] = focusSetting,
        ["ff02"] = focusSetting,
    }
    return info[server]
end

return {getServerInfo=getServerInfo}