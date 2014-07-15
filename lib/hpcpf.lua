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

function dumpTable(t,prefix)
    if (prefix==nil) then prefix="" end
    for i,v in pairs(t) do
        print(prefix,i,v)
        if (type(v)=='table') then
            dumpTable(v,prefix.."-")
        end
    end
end

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
