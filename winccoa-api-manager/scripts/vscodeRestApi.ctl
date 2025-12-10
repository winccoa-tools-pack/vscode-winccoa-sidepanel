// =======================
// Includes
// =======================

#uses "CtrlHTTP"
#uses "json"
//#uses "vscodeExtensionService" //stellt getAllManager, startManager, stopManager, getProjectInfo bereit
#uses "pmon"
#uses "CtrlHTTP"


// =======================
// constants
// =======================
const int MANAGER_STATUS_UNKNOWN = -1;
const int MANAGER_STATUS_STOPPED = 0;
const int MANAGER_STATUS_RUNNING = 1;


// =======================
// Helper
// =======================

// Prüft ob Wert ein Integer ist
bool isInt(anytype v)
{
  int t = getType(v);
  return (t == INT_VAR || t == UINT_VAR);
}

// Prüft ob decode-Ergebnis ein Mapping ist
bool isMapping(anytype v)
{
  return getType(v) == MAPPING_VAR;
}

// BLOB -> String (z.B. JSON-Body)
string blobToString(blob b)
{
  int len = bloblen(b);
  string s = "";
  if (len > 0)
  {
    blobGetValue(b, 0, s, len);
  }
  return s;
}

// Fehler-Response JSON
string makeErrorResponse(string msg)
{
  mapping m;
  m["success"] = FALSE;
  m["error"] = msg;
  return jsonEncode(m);
}

// Erfolgs-Response JSON (generic)
string makeSuccessResponse(mapping m)
{
  m["success"] = TRUE;
  return jsonEncode(m);
}

string jsonEscape(string str)
{
  string result = str;
  strreplace(result, "\\", "\\\\");  // Backslash escapen
  strreplace(result, "\"", "\\\"");  // Anführungszeichen escapen
  strreplace(result, "\n", "\\n");   // Newline
  strreplace(result, "\r", "\\r");   // Carriage Return
  strreplace(result, "\t", "\\t");   // Tab
  return result;
}


// =======================
// *** NEU *** Manager-Status-Helfer
// =======================

// Holt den Status eines Managers anhand des pmon-Index
// Mapping Annahme: state == 2 => RUNNING, alles andere => STOPPED
int getManagerStatus(int idx)
{
  if (idx < 0 || idx >= pmonGetCount())
  {
    DebugN("vscodeExtensionService: getManagerStatus: invalid index", idx);
    return MANAGER_STATUS_UNKNOWN;
  }

  int state = pmonGetState(idx);

  if (state == 2)
    return MANAGER_STATUS_RUNNING;

  // Alle anderen Zustände behandeln wir für den Restart-Case als "nicht laufend"
  return MANAGER_STATUS_STOPPED;
}

// einfache Wartefunktion in Sekunden
void waitSeconds(int sec)
{
  if (sec > 0)
    delay(sec);
}

// wartet mit maxTries/Delay darauf, dass ein Manager STOPPED ist
bool waitForManagerStopped(int idx, int maxTries, int delaySec)
{
  int itry;
  for (itry = 1; itry <= maxTries; itry++)
  {
    int status = getManagerStatus(idx);

    if (status == MANAGER_STATUS_STOPPED)
    {
      DebugN("vscodeExtensionService: Manager", idx, "is STOPPED (itry", itry, ")");
      return TRUE;
    }

    DebugN("vscodeExtensionService: Manager", idx, "not stopped yet (status", status, ") – sending STOP (itry", itry, ")");
    stopManager(idx);
    waitSeconds(delaySec);
  }

  // finaler Check nach den Versuchen
  int finalStatus = getManagerStatus(idx);
  if (finalStatus == MANAGER_STATUS_STOPPED)
  {
    DebugN("vscodeExtensionService: Manager", idx, "stopped after retries");
    return TRUE;
  }

  DebugN("vscodeExtensionService: waitForManagerStopped: Manager", idx, "could not be stopped");
  return FALSE;
}

// wartet mit maxTries/Delay darauf, dass ein Manager RUNNING ist
bool waitForManagerRunning(int idx, int maxTries, int delaySec)
{
  int itry;
  for (itry = 1; itry <= maxTries; itry++)
  {
    int status = getManagerStatus(idx);

    if (status == MANAGER_STATUS_RUNNING)
    {
      DebugN("vscodeExtensionService: Manager", idx, "is RUNNING (itry", itry, ")");
      return TRUE;
    }

    DebugN("vscodeExtensionService: Manager", idx, "not running yet (status", status, ") – sending START (itry", itry, ")");
    startManager(idx);
    waitSeconds(delaySec);
  }

  // finaler Check nach den Versuchen
  int finalStatus = getManagerStatus(idx);
  if (finalStatus == MANAGER_STATUS_RUNNING)
  {
    DebugN("vscodeExtensionService: Manager", idx, "running after retries");
    return TRUE;
  }

  DebugN("vscodeExtensionService: waitForManagerRunning: Manager", idx, "could not be started");
  return FALSE;
}

// Restart-Logik
// Rückgabewerte:
//  0  = Erfolg
// -1  = Stop fehlgeschlagen
// -2  = Start nach Stop fehlgeschlagen
int restartManager(int idx)
{
  DebugN("vscodeExtensionService: restartManager aufgerufen für idx:", idx);

  // 1) Stop-Phase: max. 4 Versuche, 5 Sekunden Delay
  bool stopped = waitForManagerStopped(idx, 4, 5);

  if (!stopped)
  {
    DebugN("vscodeExtensionService: restartManager: Stop failed for manager", idx);
    return -1;
  }

  // 2) Start-Phase: max. 3 Versuche, 5 Sekunden Delay
  bool started = waitForManagerRunning(idx, 3, 5);

  if (!started)
  {
    DebugN("vscodeExtensionService: restartManager: Start failed for manager", idx);
    return -2;
  }

  DebugN("vscodeExtensionService: restartManager: Manager", idx, "successfully restarted");
  return 0;
}

// =======================
// main: HTTP-Server & Routes
// =======================

main()
{
  int port = 3000;

  if (httpServer(FALSE, port, 0) < 0)
  {
    DebugN("ERROR: HTTP server could not be started on port", port);
    return;
  }

  // Health / Info
  httpConnect("healthCb", "/api/health", "application/json");
  httpConnect("infoCb", "/api/info", "application/json");

  // Wichtige Endpunkte aus deinem TS-Code:
  httpConnect("executeScriptCb", "/api/script/execute", "application/json");
  httpConnect("getManagersCb", "/api/managers", "application/json");
  httpConnect("startManagerCb", "/api/manager/start", "application/json");
  httpConnect("stopManagerCb", "/api/manager/stop", "application/json");
  httpConnect("getProjectInfoCb", "/api/getProjectInfo", "application/json");

  // *** NEU *** Restart-Endpunkt
  httpConnect("restartManagerCb", "/api/manager/restart", "application/json");
  
  // *** NEU *** Reload CTRL Libraries
  httpConnect("reloadCtrlLibsCb", "/api/reloadCtrlLibs", "application/json");

  DebugN("WinCC OA REST API ready on port", port);
  DebugN("Endpoints:");
  DebugN("  GET  /api/health");
  DebugN("  GET  /api/info");
  DebugN("  POST /api/script/execute");
  DebugN("  GET  /api/managers");
  DebugN("  POST /api/manager/start");
  DebugN("  POST /api/manager/stop");
  DebugN("  POST /api/manager/restart"); // *** NEU ***
  DebugN("  GET  /api/reloadCtrlLibs");  // *** NEU ***
  DebugN("  GET  /api/getProjectInfo");
}

// =======================
// /api/health
// =======================

string healthCb(
  dyn_string names,
  dyn_string values,
  string user,
  string ip,
  dyn_string headerNames,
  dyn_string headerValues,
  int connectionIndex)
{
  mapping m;
  m["status"] = "ok";
  // primitive uptime-Ersatz: kein echtes process.uptime(), aber reicht als Stub
  m["timestamp"] = (string)sysTime();

  dyn_string res;
  res[1] = jsonEncode(m);
  res[2] = "Content-Type: application/json";
  return res;
}

// =======================
// /api/info
// =======================

string infoCb(
  dyn_string names,
  dyn_string values,
  string user,
  string ip,
  dyn_string headerNames,
  dyn_string headerValues,
  int connectionIndex)
{
  mapping m;
  m["success"] = TRUE;
  m["service"] = "WinCC OA Script Execution Service";
  m["version"] = "1.0.0";
  m["timestamp"] = (string)sysTime();

  dyn_string res;
  res[1] = jsonEncode(m);
  res[2] = "Content-Type: application/json";
  return res;
}

// =======================
// POST /api/script/execute
// Body:
// {
//   "scriptName": "libs/vscodeExtensionService",
//   "functionName": "getAllManager",
//   "functionParams": [],
//   "paramTypes": []
// }
// =======================

string executeScriptCb(
  blob content,
  string user,
  string ip,
  dyn_string headerNames,
  dyn_string headerValues,
  int connectionIndex)
{
  int iRet;

  string method = httpGetMethod(connectionIndex);
  if (method != "POST")
  {
    dyn_string r;
    r[1] = makeErrorResponse("Method not allowed");
    r[2] = "Status: 405 Method Not Allowed";
    r[3] = "Content-Type: application/json";
    return r;
  }

  string bodyText = blobToString(content);
  anytype decoded = jsonDecode(bodyText);

  if (!isMapping(decoded))
  {
    dyn_string r;
    r[1] = makeErrorResponse("Invalid JSON body");
    r[2] = "Content-Type: application/json";
    return r;
  }

  mapping body = decoded;

  // Support both scriptName (old) and scriptPath (new)
  string scriptPath = (string)body["scriptPath"];
  if (scriptPath == "")
  {
    scriptPath = (string)body["scriptName"];
  }

  if (scriptPath == "")
  {
    dyn_string r;
    r[1] = makeErrorResponse("scriptPath or scriptName is required");
    r[2] = "Status: 400 Bad Request";
    r[3] = "Content-Type: application/json";
    return r;
  }

  string functionName = (string)(body["functionName"] != "" ? body["functionName"] : "main");

  dyn_anytype  functionParams; //TODO: implement script Start with Parameters
  //   if (body["functionParams"] != NULL)
  //     functionParams = (dyn_mixed)body["functionParams"];

  //DebugN("executeScript:", scriptPath, "::", functionName, "params:", functionParams);
  //TODO ADD INFO Debug

  int iRet;
  string ret;
  bool ok = TRUE;

  dyn_string dollars = makeDynString();     // keine $-Parameter
  dyn_anytype params = makeDynAnytype();    // keine Funktions-Parameter

  iRet = executeScriptWCCOActrl(scriptPath);

  if (iRet != 0) 
  {
    ret = "Script start failed: " + scriptPath;
    ok = FALSE;
  }

  mapping resp;
  resp["scriptPath"] = scriptPath;
  resp["functionName"] = functionName;
  resp["returnValue"] = ret;

  dyn_string r;
  if (ok)
    r[1] = makeSuccessResponse(resp);
  else
    r[1] = makeErrorResponse((string)ret);

  r[2] = "Content-Type: application/json";
  return r;
}

int executeScriptWCCOActrl(string scriptPath)
{
  string stdOut, stdErr;
  string projPath = getPath(PROJ_PATH);   // z.B. C:/WinCC_OA_Proj/DevEnv_3.20

  // 1) Existenz prüfen
  if (!isfile(scriptPath))
  {
    //ret = "Script file not found: " + scriptPath;
    return -1;
  }

  // Projektname aus Pfad ziehen
  dyn_string parts = strsplit(projPath, "/");
  string projName = parts[dynlen(parts)];

  // Programm bauen (wie in deinem Beispiel)
  string cmd = makeNativePath(WINCCOA_BIN_PATH) + getComponentName(CTRL_COMPONENT);

  if ( _WIN32 )
    cmd += ".exe";

  // ARGS in der richtigen Reihenfolge:
  //   <scriptPath>  -proj  <projectName>
  dyn_string args = makeDynString(scriptPath, "-proj", projName);

  // MAPPING — genauso wie in DEINEM Beispiel
  mapping options = makeMapping(
    "program",   cmd,
    "arguments", args,
    "timeout",  -1
  );

  // SYSTEM CALL
  int pid = system(options, stdOut, stdErr);

//DebugTN("PID:", pid);

  return 0;
}

// =======================
// GET /api/managers
// Ruft libs/vscodeExtensionService.getAllManager()
// Erwartet: getAllManager() gibt JSON-String zurück.
// =======================

string getManagersCb(
  dyn_string names,
  dyn_string values,
  string user,
  string ip,
  dyn_string headerNames,
  dyn_string headerValues,
  int connectionIndex)
{
  string method = httpGetMethod(connectionIndex);
  if (method != "GET")
  {
    dyn_string r;
    r[1] = makeErrorResponse("Method not allowed");
    r[2] = "Status: 405 Method Not Allowed";
    r[3] = "Content-Type: application/json";
    return r;
  }

  string raw = getAllManager(); // schon JSON
  dyn_string res;
  res[1] = raw;
  res[2] = "Content-Type: application/json";
  return res;
}

string getAllManager()
{
  // Gibt JSON mit allen Managern zurück (type, status, pid, options)
  string json = "{\"success\":true,\"managers\":[";

  for (int i = 0; i < pmonGetCount(); i++)
  {
    string managerType = pmonGetName(i);
    int state = pmonGetState(i);
    int pid = pmonGetPID(i);
    string options = pmonGetOptions(i);

    // JSON-Objekt für diesen Manager bauen
    if (i > 0) json += ",";

    json += "{";
    json += "\"idx\":" + i + ",";
    json += "\"type\":\"" + jsonEscape(managerType) + "\",";
    json += "\"status\":" + state + ",";

    // PID nur wenn Manager läuft (state == 2), sonst null
    if (state == 2 && pid > 0)
      json += "\"pid\":" + pid + ",";
    else
      json += "\"pid\":null,";

    // Options (escaped, leerer String ist OK)
    json += "\"options\":\"" + jsonEscape(options) + "\"";

    json += "}";
  }

  json += "]}";
  return json;
}

// =======================
// POST /api/manager/start
// Body: { "managerId": 123 }
// =======================

string startManagerCb(
  blob content,
  string user,
  string ip,
  dyn_string headerNames,
  dyn_string headerValues,
  int connectionIndex)
{
  string method = httpGetMethod(connectionIndex);
  if (method != "POST")
  {
    dyn_string r;
    r[1] = makeErrorResponse("Method not allowed");
    r[2] = "Status: 405 Method Not Allowed";
    r[3] = "Content-Type: application/json";
    return r;
  }

  string bodyText = blobToString(content);
  anytype decoded = jsonDecode(bodyText);

  if (!isMapping(decoded))
  {
    dyn_string r;
    r[1] = makeErrorResponse("Invalid JSON body");
    r[2] = "Content-Type: application/json";
    return r;
  }

  mapping body = decoded;
  anytype mid = body["managerId"];

  if (!isInt(mid))
  {
    dyn_string r;
    r[1] = makeErrorResponse("managerId (int) is required");
    r[2] = "Status: 400 Bad Request";
    r[3] = "Content-Type: application/json";
    return r;
  }

  int managerId = (int)mid;
  DebugN("Starting manager with ID:", managerId);

  anytype result = startManager(managerId);

  mapping resp;
  resp["managerId"] = managerId;
  resp["result"] = result;
  resp["message"] = "Manager started";

  dyn_string res;
  res[1] = makeSuccessResponse(resp);
  res[2] = "Content-Type: application/json";
  return res;
}

int startManager(int idx)
{
  DebugN("vscodeExtensionService: startManager aufgerufen für idx: " + idx);  int iRet;
  string projName = "";
  string sUser = "";
  string sPassword = "";
  string str, host;
  int port;

  // Extract project name from PROJ_PATH
  string projPath = getPath(PROJ_PATH);
  dyn_string parts = strsplit(projPath, "/");
  projName = parts[dynlen(parts)];

  if (projName == "")
  {
    DebugN("vscodeExtensionService: stopManager failed to get project name from PROJ_PATH");
    return -1;
  }

  paGetProjHostPort(projName, host, port);

  if (host == "" || port == 0)
  {
    DebugN("vscodeExtensionService: startManager failed to get host/port for project " + projName);
    return -1;
  }

  sprintf(str, "SINGLE_MGR:START %d", idx);
  str = sUser + "#" + sPassword + "#" + str;

  iRet = pmon_command(str, host, port, true, true);

  if (iRet != 0)
  {
    DebugN("vscodeExtensionService: startManager failed for idx " + idx + " with error " + iRet);
    return -1;
  }

  return 0;
}

// =======================
// POST /api/manager/stop
// Body: { "managerId": 123 }
// =======================

string stopManagerCb(
  blob content,
  string user,
  string ip,
  dyn_string headerNames,
  dyn_string headerValues,
  int connectionIndex)
{
  string method = httpGetMethod(connectionIndex);
  if (method != "POST")
  {
    dyn_string r;
    r[1] = makeErrorResponse("Method not allowed");
    r[2] = "Status: 405 Method Not Allowed";
    r[3] = "Content-Type: application/json";
    return r;
  }

  string bodyText = blobToString(content);
  anytype decoded = jsonDecode(bodyText);

  if (!isMapping(decoded))
  {
    dyn_string r;
    r[1] = makeErrorResponse("Invalid JSON body");
    r[2] = "Content-Type: application/json";
    return r;
  }

  mapping body = decoded;
  anytype mid = body["managerId"];

  if (!isInt(mid))
  {
    dyn_string r;
    r[1] = makeErrorResponse("managerId (int) is required");
    r[2] = "Status: 400 Bad Request";
    r[3] = "Content-Type: application/json";
    return r;
  }

  int managerId = (int)mid;
  DebugN("Stopping manager with ID:", managerId);

  anytype result = stopManager(managerId);

  mapping resp;
  resp["managerId"] = managerId;
  resp["result"] = result;
  resp["message"] = "Manager stopped";

  dyn_string res;
  res[1] = makeSuccessResponse(resp);
  res[2] = "Content-Type: application/json";
  return res;
}

int stopManager(int idx)
{
  DebugN("vscodeExtensionService: stopManager aufgerufen für idx: " + idx);
  int iRet;
  string projName = "";
  string sUser = "";
  string sPassword = "";
  string str, host;
  int port;

  // Extract project name from PROJ_PATH
  string projPath = getPath(PROJ_PATH);
  dyn_string parts = strsplit(projPath, "/");
  projName = parts[dynlen(parts)];

  if (projName == "")
  {
    DebugN("vscodeExtensionService: stopManager failed to get project name from PROJ_PATH");
    return -1;
  }

  // Get host and port for the project
  paGetProjHostPort(projName, host, port);

  if (host == "" || port == 0)
  {
    DebugN("vscodeExtensionService: startManager failed to get host/port for project " + projName);
    return -1;
  }

  sprintf(str, "SINGLE_MGR:STOP %d", idx);
  str = sUser + "#" + sPassword + "#" + str;

  iRet = pmon_command(str, host, port, true, true);

  if (iRet != 0)
  {
    DebugN("vscodeExtensionService: startManager failed for idx " + idx + " with error " + iRet);
    return -1;
  }

  return 0;
}

// =======================
// *** NEU *** POST /api/manager/restart
// Body: { "managerId": 123 }
// =======================

string restartManagerCb(
  blob content,
  string user,
  string ip,
  dyn_string headerNames,
  dyn_string headerValues,
  int connectionIndex)
{
  string method = httpGetMethod(connectionIndex);
  if (method != "POST")
  {
    dyn_string r;
    r[1] = makeErrorResponse("Method not allowed");
    r[2] = "Status: 405 Method Not Allowed";
    r[3] = "Content-Type: application/json";
    return r;
  }

  string bodyText = blobToString(content);
  anytype decoded = jsonDecode(bodyText);

  if (!isMapping(decoded))
  {
    dyn_string r;
    r[1] = makeErrorResponse("Invalid JSON body");
    r[2] = "Content-Type: application/json";
    return r;
  }

  mapping body = decoded;
  anytype mid = body["managerId"];

  if (!isInt(mid))
  {
    dyn_string r;
    r[1] = makeErrorResponse("managerId (int) is required");
    r[2] = "Status: 400 Bad Request";
    r[3] = "Content-Type: application/json";
    return r;
  }

  int managerId = (int)mid;
  DebugN("Restarting manager with ID:", managerId);

  int result = restartManager(managerId);

  mapping resp;
  resp["managerId"] = managerId;
  resp["result"] = result;

  if (result == 0)
  {
    resp["message"] = "Manager restarted successfully";
  }
  else if (result == -1)
  {
    resp["message"] = "Failed to stop manager within max retries";
  }
  else if (result == -2)
  {
    resp["message"] = "Manager stopped but could not be started within max retries";
  }
  else
  {
    resp["message"] = "Unknown error during manager restart";
  }

  dyn_string res;
  res[1] = makeSuccessResponse(resp);
  res[2] = "Content-Type: application/json";
  return res;
}

// =======================
// GET /api/reloadCtrlLibs
// Lädt alle CTRL Libraries neu
// =======================

string reloadCtrlLibsCb(
  dyn_string names,
  dyn_string values,
  string user,
  string ip,
  dyn_string headerNames,
  dyn_string headerValues,
  int connectionIndex)
{
  string method = httpGetMethod(connectionIndex);
  if (method != "GET")
  {
    dyn_string r;
    r[1] = makeErrorResponse("Method not allowed");
    r[2] = "Status: 405 Method Not Allowed";
    r[3] = "Content-Type: application/json";
    return r;
  }

  int result = reloadCtrlLibraries();

  mapping resp;
  
  if (result == 0)
  {
    resp["message"] = "CTRL libraries reloaded successfully";
    
    dyn_string res;
    res[1] = makeSuccessResponse(resp);
    res[2] = "Content-Type: application/json";
    return res;
  }
  else
  {
    dyn_string r;
    r[1] = makeErrorResponse("Failed to reload CTRL libraries");
    r[2] = "Status: 500 Internal Server Error";
    r[3] = "Content-Type: application/json";
    return r;
  }
}

int reloadCtrlLibraries()
{
  string stdOut, stdErr;
  string projPath = getPath(PROJ_PATH);
  
  dyn_string parts = strsplit(projPath, "/");
  string projName = parts[dynlen(parts)];
  
  string cmd = makeNativePath(WINCCOA_BIN_PATH) + getComponentName(CTRL_COMPONENT);
  
  if (_WIN32)
    cmd += ".exe";
  
  dyn_string args = makeDynString("-loadAllCtrlLibs");
  
  mapping options = makeMapping(
    "program",   cmd,
    "arguments", args,
    "timeout",   -1
  );
  
  int pid = system(options, stdOut, stdErr);
  
  if (pid < 0)
  {
    DebugN("reloadCtrlLibraries: system() failed with pid:", pid);
    DebugN("stderr:", stdErr);
    return -1;
  }
  
  return 0;
}

// =======================
// GET /api/getProjectInfo
// Ruft libs/vscodeExtensionService.getProjectInfo()
// Erwartet: JSON-String
// =======================

string getProjectInfoCb(
  dyn_string names,
  dyn_string values,
  string user,
  string ip,
  dyn_string headerNames,
  dyn_string headerValues,
  int connectionIndex)
{
  string method = httpGetMethod(connectionIndex);
  if (method != "GET")
  {
    dyn_string r;
    r[1] = makeErrorResponse("Method not allowed");
    r[2] = "Status: 405 Method Not Allowed";
    r[3] = "Content-Type: application/json";
    return r;
  }

  string raw = getProjectInfo(); // jetzt neuer JSON-Payload
  dyn_string res;
  res[1] = raw;
  res[2] = "Content-Type: application/json";
  return res;
}

// Hilfsfunktion: Pfade normalisieren (Backslashes -> Slashes, Trailing Slash weg)
string normalizePath(string path)
{
  // Backslashes in Slashes wandeln (strreplace modifiziert in-place!)
  strreplace(path, "\\", "/");

  int len = strlen(path);
  if (len > 0 && substr(path, len - 1, 1) == "/")
  {
    path = substr(path, 0, len - 1);
  }

  return path;
}

// Fixt doppelte Pfade die WinCC OA manchmal zurückgibt
// Linux: "/home/proj/DevEnv//home/proj/DevEnv" -> "/home/proj/DevEnv"
// Linux: "/home/proj/DevEnv//opt/WinCC_OA/3.20" -> "/opt/WinCC_OA/3.20"
// Windows: "C:/Proj/DevEnv/C:/Proj/DevEnv" -> "C:/Proj/DevEnv"
// Windows: "C:/Proj/DevEnv/D:/WinCC_OA/3.20" -> "D:/WinCC_OA/3.20"
string fixDuplicatePath(string path)
{
  // Normalisiere zuerst
  path = normalizePath(path);
  
  // Fall 1: Doppelter Slash (Linux)
  int pos = strpos(path, "//", 1);
  
  if (pos > 0)
  {
    // Nimm den Teil nach dem //
    string result = substr(path, pos + 2);
    return result;
  }
  
  // Fall 2: Windows - suche nach zweitem Laufwerksbuchstaben (z.B. "C:/path/D:" oder "C:/path/C:")
  // Pattern: X:/.../<Buchstabe>:
  int len = strlen(path);
  
  for (int i = 3; i < len - 1; i++)
  {
    // Suche nach "/" gefolgt von Buchstabe und ":"
    if (substr(path, i, 1) == "/" && 
        i + 2 < len &&
        substr(path, i + 2, 1) == ":")
    {
      // Gefunden! Nimm alles ab dem Laufwerksbuchstaben
      string result = substr(path, i + 1);
      return result;
    }
  }
  
  return path;
}

// Liest die config-Datei und baut das JSON-Array für "subProjects"
string getSubProjectsJson(string mainProjPath, string configFilePath)
{
  string fileContent;
  bool ok = fileToString(configFilePath, fileContent); // UTF-8 Projekt -> encoding-Parameter nicht nötig

  if (!ok || fileContent == "")
  {
    DebugN("vscodeExtensionService[SubProjects] NO CONFIG or EMPTY: ", configFilePath);
    return "[]";
  }

  string normalizedMain = normalizePath(mainProjPath);

  dyn_string lines = strsplit(fileContent, "\n");

  string json = "[";
  bool first = TRUE;

  int i;
  for (i = 1; i <= dynlen(lines); i++)
  {
    string line = lines[i];
    line = strreplace(line, "\r", "");


    line = line.trimmed();
    if (line == "")
    {
      continue;
    }

    string trimmed = line.trimmed();

    if (trimmed.startsWith("#"))
    {
      continue;
    }

    if (strpos(trimmed, "proj_path") == -1)
    {
      continue;
    }


    string key, value;
    int parsed = sscanf(trimmed, "%s = \"%[^\"]\"", key, value);

    if (parsed != 2)
    {
      continue;
    }

    if (key != "proj_path")
    {
      continue;
    }

    string normalizedSub = normalizePath(value);

    if (normalizedSub == normalizedMain)
    {
      continue;
    }

    dyn_string parts = strsplit(normalizedSub, "/");
    string subName = parts[dynlen(parts)];


    if (!first)
      json += ",";
    first = FALSE;

    json += "{";
    json += "\"name\":\"" + jsonEscape(subName) + "\",";
    json += "\"path\":\"" + jsonEscape(value) + "\"";
    json += "}";
  }

  json += "]";


  return json;
}

string getProjectInfo()
{
  // Basisdaten - OHNE normalizePath, direkt verwenden
  string version    = VERSION;
  string projPath   = getPath(PROJ_PATH);          // z.B. C:/WinCC_OA_Proj/DevEnv_3.20
  string installPath = getPath(PVSS_PATH);         // z.B. C:/Siemens/Automation/WinCC_OA/3.20
  string configDir  = getPath(CONFIG_REL_PATH);    // <proj_path>/config/
  string logPath    = getPath(LOG_REL_PATH);       // <proj_path>/log/

  // Fix doppelte Pfade (WinCC OA Bug)
  projPath = fixDuplicatePath(projPath);
  installPath = fixDuplicatePath(installPath);
  configDir = normalizePath(configDir);
  logPath = normalizePath(logPath);

  // Projektname aus Pfad ziehen
  dyn_string parts = strsplit(projPath, "/");
  string projName = parts[dynlen(parts)];

  // Vollständiger Pfad zur Projekt-config
  string configPath = configDir + "/config";        // <proj_path>/config/config

  // Subprojekte aus der config lesen
  string subProjectsJson = getSubProjectsJson(projPath, configPath);

  // JSON zusammenbauen – Struktur wie von dir vorgegeben
  string res;
  res  = "{";
  res += "\"success\":true,";
  res += "\"projectInfo\":{";
  res +=   "\"projectPath\":\""  + jsonEscape(projPath)   + "\",";
  res +=   "\"projectName\":\""  + jsonEscape(projName)   + "\",";
  res +=   "\"configPath\":\""   + jsonEscape(configPath) + "\",";
  res +=   "\"logPath\":\""      + jsonEscape(logPath)    + "\",";
  res +=   "\"installPath\":\""  + jsonEscape(installPath)+ "\",";
  res +=   "\"version\":\""      + jsonEscape(version)    + "\",";
  res +=   "\"subProjects\":"    + subProjectsJson;
  res += "}";
  res += "}";

  return res;
}
