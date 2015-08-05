
local excase = {}

function generateTargetConf(args_table)
	for i, k in pairs(args_table) do
		--print(i, k);
		if (i == 1) and next(k) then
			for n, m in pairs(k) do
				--print(n, m);
				if n == "machine" then
					return m;
				end
			end
		end
	end
end

function getCores(args_table)
	for i, k in pairs(args_table) do
		if (i == 1) and next(k) then
			for n, m in pairs(k) do
				if n == "cores" then
					return m;
				end
			end
		end
	end
	return 1;
end

function getInputNodes(args_table)
	local list = {}
	for i, k in pairs(args_table) do
		if (i == 3) then
			for n, m in pairs(k) do
				table.insert(list, m);
			end
		end
	end
	return list;
end

function getOutputFiles(casename)
	local cmdFile = 'cmd.json';
	local cmd = readJSON(cmdFile);
	local result = nil;
	if (cmd ~= nil) then
		if (cmd.hpcpf.case_meta_data.outputs ~= nil) then
			for i, v in pairs(cmd.hpcpf.case_meta_data.outputs) do
				if v.file ~= nil then
					v.file = '../' .. casename .. '/' .. v.file;
				end
			end
			result = cmd.hpcpf.case_meta_data.outputs;
		end
	end
	return result;
end

function getCollectionFiles(casename)
	local cmdFile = 'cmd.json';
	local cmd = readJSON(cmdFile);
	local result = nil;
	if (cmd ~= nil) then
		if (cmd.hpcpf.case_meta_data.collection_files ~= nil) then
			--for i, v in pairs(cmd.hpcpf.case_meta_data.collection_files) do
			--	if v.path ~= nil then
			--		v.path = casename .. '/' .. v.path;
			--	end
			--end
			result = cmd.hpcpf.case_meta_data.collection_files;
		end
	end
	return result;
end

function getNodes(args_table)
	for i, k in pairs(args_table) do
		if (i == 1) and next(k) then
			for n, m in pairs(k) do
				if n == "nodes" then
					return m;
				end
			end
		end
	end
	return 1;
end

function isDryRun(args_table)
	for i, k in pairs(args_table) do
		if (i == 2) then
			return k;
		end
	end
	return false;
end

function excase(args_table)
	local caseDir = getCurrentDir() .. getBasePath()
	local projectDir
	local upPath
	local caseName
	local projectName
	projectDir, caseName = getDirAndName(caseDir)
	projectDir = projectDir:sub(1, projectDir:len()-1) -- remove sparator
	upPath, projectName = getDirAndName(projectDir)

	--[[
	print('-------------')
	print('Case:', caseDir, '/', caseName)
	print('Project:', projectDir, '/', projectName)
	print('UpPath:', upPath)
	print('-------------')
	--]]

	local inst = {
		targetConf = generateTargetConf(args_table),
		cores = getCores(args_table),
		nodes = getNodes(args_table),
		inputNodes = getInputNodes(args_table),
		outputFiles = getOutputFiles(caseName),
		collectionFiles = getCollectionFiles(caseName),
		isDryRun = isDryRun(args_table),
		caseName = caseName,
		caseDir = caseDir,
		projectDir = projectDir,
		projectName = projectName,
		projectUpDir = upPath
	}
	return inst;
end

return excase;

