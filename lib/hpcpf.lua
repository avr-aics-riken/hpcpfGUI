
local excase = require('excase')

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
    if package.config:sub(1,1) == "\\" then
        return 'Windows'
    else
	    local plf = captureRedirectErr('uname')
        return plf -- 'Darwin', 'Linux'
    end
end


-- force buffer flush function
orgPrint = print
print = function(...) orgPrint(...) io.stdout:flush() end


function errorlog(msg)
    io.stderr:write(msg .. '\n')
end


-- File/Dir Utility fuctions

function compressFile(srcname, tarname, verbose, opt)
    local tarcmd
    local optcmd = opt and opt or ''
    local option = (verbose == true) and '-czvf' or '-czf'
    if (getPlatform() == 'Windows') then
        local TAR_CMD = HPCPF_BIN_DIR .. '/tar.exe'
        tarcmd =  TAR_CMD .. ' ' .. optcmd .. ' ' .. option .. ' ' .. tarname .. ' ' .. srcname
    else
        local TAR_CMD = 'tar'
        tarcmd =  TAR_CMD .. ' ' .. optcmd .. ' ' .. option .. ' ' .. tarname .. ' ' .. srcname
    end
    print(tarcmd)
    local handle = io.popen(tarcmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

function extractFile(tarname, verbose, opt)
    local tarcmd
    local optcmd = opt and opt or ''
    local option = verbose and '-xvf' or '-xf'
    if (getPlatform() == 'Windows') then
        local TAR_CMD = HPCPF_BIN_DIR .. '/tar.exe'
        tarcmd =  TAR_CMD .. ' ' .. optcmd .. ' '.. option .. ' ' .. tarname
    else
        local TAR_CMD = 'tar'
        tarcmd =  TAR_CMD .. ' ' .. optcmd .. ' '.. option .. ' ' .. tarname
    end
    print(tarcmd)
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
 
local s_base_path=""
function setBasePath(dir)
    s_base_path = dir
end
function getBasePath()
    return s_base_path 
end


function execmd(command)
    local handle = io.popen(command,"r")
    local content = handle:read("*all")
    handle:close()
    return content
end

function getCurrentDir()
    local pwdcmd
    if (getPlatform() == 'Windows') then
        pwdcmd = 'cd'
    else
        pwdcmd = 'pwd'
    end
    
    return execmd(pwdcmd):gsub('\n','')
end

--- JSON loader

local json = require('dkjson')

function readJSON(filename)
    local filestr = ''
    local fp = io.open('.' .. getBasePath() .. '/' ..filename,'r');
	print("JSONPath", '.' .. getBasePath() .. '/' ..filename)
    local jst = nil
    if (fp) then
        filestr = fp:read("*all")
        jst = json.decode (filestr, 1, nil)
    end
    return jst;
end

function writeJSON(filename, tbl)
	local filestr = ''
	local fp = io.open('.' .. getBasePath() .. '/' ..filename,'w');
	if (fp) then
		fp:write(json.encode(tbl, { indent = true }))
		fp:close();
	end
end

function writeCEI(path, tbl, status)
	if (tbl.hpcpf == nil) then
		return;
	end
	tbl.hpcpf.case_exec_info.status = status;
	writeJSON(path, tbl);
end


function getInitialCeiDescription(workdir, server, hosttype)
	return {
		hpcpf = {
			case_exec_info = {
				work_dir = server .. ":" .. workdir,
				target = hosttype
			}
		}
	}
end

function executeCASE(casename,...)
    local args_table = {...}
    --print("num="..#args_table)
    local cf = assert(loadfile('./'..casename..'/cwf.lua'));
	local result = nil;
    if (cf == nil) then
        print("Can't find Case work flow:"..casename)
        print("or can't find " .. casename..'/cwf.lua')
    else
        print("--- Start CASE: "..casename.." ---")
        setBasePath('/' .. casename)
        local oldPackagePath = package.path
        package.path = "./" .. casename .. "/?.lua;" .. oldPackagePath
		
		local ex = excase(args_table);
		
		-- write cei.json
		local ceiFile = "cei.json";
		local cei = readJSON(ceiFile);
		if (cei == nil) then
			local targetconf = ex.targetConf
			local workdir = targetconf.workpath;
			if string.sub(workdir, workdir:len()) ~= '/' then
				workdir = workdir .. '/'
			end
			workdir = workdir .. casename .. '/'
			cei = getInitialCeiDescription(workdir,  targetconf.server, targetconf.type);
			if (ex.isDryRun) then
				writeCEI(ceiFile, cei, 'Running(Dry)')
			else
				writeCEI(ceiFile, cei, 'Running')
			end
		else
			if (cei.hpcpf.case_exec_info.status == 'Finished') then
				print("--- End   CASE: "..casename.." ---")
				return cei.hpcpf.case_exec_info.result;
			end
		end
		
		-- execute
		result = cf(ex)
		
		-- write result to cei.json
		if (result ~= nil) then
			cei.hpcpf.case_exec_info.result = result;
			if (ex.isDryRun) then
				writeCEI(ceiFile, cei, 'Finished(Dry)');
			else
				writeCEI(ceiFile, cei, 'Finished');
			end
		else
			if (ex.isDryRun) then
				writeCEI(ceiFile, cei, 'Failed(Dry)');
			else
				writeCEI(ceiFile, cei, 'Failed');
			end
		end
		
        package.path = oldPackagePath
        setBasePath('')
        print("--- End   CASE: "..casename.." ---")
    end
	return result;
end


--- Sleep
function sleep(n)
    if getPlatform() == 'Windows' then
        --os.execute("timeout /NOBREAK /T " .. math.floor(tonumber(n)) .. ' > nul')
        local cmd = HPCPF_BIN_DIR .. '/sleeper.exe ' .. math.floor(n)
        os.execute(cmd)
    else
        os.execute("sleep " .. tonumber(n))
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

-- xjob
-- require('xjob')
