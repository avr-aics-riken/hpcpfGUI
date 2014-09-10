

--- for detection platform (return "Windows", "Darwin" or "Linux")

function getPlatform()
    --- command capture
    function captureRedirectErr(cmd)
        local f = assert(io.popen(cmd .. ' 2>&1' , 'r'))
        local s = assert(f:read('*a'))
        f:close()
        s = string.gsub(s, '^%s+', '')
        s = string.gsub(s, '%s+$', '')
        s = string.gsub(s, '[\n\r]+', ' ')
        return s
    end
    local plf = captureRedirectErr('uname')
    if string.sub(plf,1,8) == "'uname' " then -- not found 'uname' cmd
        return 'Windows'
    else
        return plf -- 'Darwin', 'Linux'
    end
end

-- File/Dir Utility fuctions

function compressFile(srcname, tarname, verbose)
    local tarcmd
    local option = verbose and 'czvf' or 'czf'
    if (getPlatform() == 'Windows') then
        local TAR_CMD = HPCPF_BIN_DIR .. '/tar.exe'
        tarcmd =  TAR_CMD .. ' ' .. option .. ' ' .. tarname .. ' ' .. srcname
    else
        local TAR_CMD = 'tar'
        tarcmd =  TAR_CMD .. ' ' .. option .. ' ' .. tarname .. ' ' .. srcname
    end
    local handle = io.popen(tarcmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

function extractFile(tarname, verbose)
    local tarcmd
    local option = verbose and 'xvf' or 'xf'
    if (getPlatform() == 'Windows') then
        local TAR_CMD = HPCPF_BIN_DIR .. '/tar.exe'
        tarcmd =  TAR_CMD .. ' ' .. option .. ' ' .. tarname
    else
        local TAR_CMD = 'tar'
        tarcmd =  TAR_CMD .. ' ' .. option .. ' ' .. tarname
    end
    local handle = io.popen(tarcmd)
    local result = handle:read("*a")
    handle:close()
    return result
end



function deleteFile(filename)
    local rmcmd
    if (getPlatform() == 'Windows') then
        rmcmd = 'del /Q'
    else
        rmcmd = 'rm '
    end
    local cmd = rmcmd .. ' ' .. filename
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

function deleteDir(dirname)
    local rmcmd
    if (getPlatform() == 'Windows') then
        rmcmd = 'rd /q /s'
    else
        rmcmd = 'rm -rf'
    end
    local cmd = rmcmd .. ' ' .. dirname
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

function moveFile(fromFile, toFile)
    local mvcmd
    if (getPlatform() == 'Windows') then
        mvcmd = 'move'
    else
        mvcmd = 'mv'
    end
    local cmd = mvcmd .. ' ' .. fromFile .. ' ' .. toFile
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result
end


function copyFile(fromFile, toFile)
    local cpcmd
    if (getPlatform() == 'Windows') then
        cpcmd = 'copy'
    else
        cpcmd = 'cp'
    end
    local cmd = cpcmd .. ' ' .. fromFile .. ' ' .. toFile
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

function makeDir(dirpath)
    local mkcmd = 'mkdir'
    local cmd = mkcmd .. ' ' .. dirpath
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

--- Lua Utility

function dumpTable(t,prefix)
    if (prefix==nil) then prefix="" end
    for i,v in pairs(t) do
        print(prefix,i,v)
        if (type(v)=='table') then
            dumpTable(v,prefix.."-")
        end
    end
end



--- execution for CASE
 
local s_base_path="./"
function setBasePath(dir)
    s_base_path = dir
end
function getBasePath()
    return s_base_path 
end

function executeCASE(casename,...)
    local args_table = {...}
    --print("num="..#args_table)
    local cf = loadfile('./'..casename..'/case.cwl');
    if (cf == nil) then
        print("Can't find Case work flow:"..casename)
    else
        print("--- Start CASE: "..casename.." ---")
        setBasePath('./'..casename..'/')
        cf(args_table) 
        setBasePath('./')
        print("--- End   CASE: "..casename.." ---")
    end
end

--- JSON loader

local json = require('dkjson')

function readJSON(filename)
    local filestr = ''
    local fp = io.open(s_base_path..filename,'r');
    local jst = nil
    if (fp) then
        filestr = fp:read("*all")
        jst = json.decode (filestr, 1, nil)
    end
    return jst;
end


--- Sleep
function sleep(n)
    if getPlatform() == 'Windows' then
        os.execute("timeout /NOBREAK /T " .. tonumber(n) .. ' > nul')
    else
        os.execute("sleep " .. tonumber(n))
    end
end

-- xjob
require('xjob')
