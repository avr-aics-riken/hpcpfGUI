function readJSON(filename)
  local json = require('dkjson')
  local fp = io.open(filename,'r');
  local jst = nil
  if (fp) then
    --print("DEBUG: successfully opened", filename)
    filestr = fp:read("*all")
    jst = json.decode (filestr, 1, nil)
  else
    print('JSON file open failed!!', filename)
  end
  return jst;
end

local function getServerInfo(server)
    local envconf=readJSON(HPCPF_BIN_DIR .. "/../conf/envconf.json")
    local info = {
        ["localhost"] = envconf.localhostSetting,
        ["k.aics.riken.jp"] = envconf.kSetting,
        ["ssh.j-focus.jp"]  = envconf.focusTunnelSetting,
        ["ff01.j-focus.jp"] = envconf.focusSetting,
        ["ff02.j-focus.jp"] = envconf.focusSetting,
        ["ff01"] = envconf.focusSetting,
        ["ff02"] = envconf.focusSetting,
        ["ff01ffv"] = envconf.focusSettingFFV,
    }
	if info[server] ~= nil then
        local batch=readJSON(HPCPF_BIN_DIR .. "/../conf/batch.json")
        info[server].submitCmd=batch.submitCmd
        info[server].delCmd=batch.delCmd
        info[server].statCmd=batch.statCmd
        info[server].submitIDRow=batch.submitIDRow
        info[server].statStateColumn=batch.statStateColumn
        info[server].statStateRow=batch.statStateRow
        info[server].exitCode=batch.exitCode
    	return info[server]
	else
        print('DEBUG: server does not match any settings')
		return localhostSetting
	end
end

return {getServerInfo=getServerInfo}
