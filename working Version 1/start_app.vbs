Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strDir

' Check if server is already running on port 8080 without opening any CMD window
serverRunning = False
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
If http Is Nothing Then Set http = CreateObject("MSXML2.ServerXMLHTTP")
If http Is Nothing Then Set http = CreateObject("Microsoft.XMLHTTP")
http.open "GET", "http://localhost:8080/data/categories.json", False
http.setTimeouts 500, 500, 500, 500
http.send ""
If Err.Number = 0 Then
    serverRunning = True
End If
On Error Goto 0

' If server is not running, launch PHP server in completely hidden mode (0 = SW_HIDE)
If Not serverRunning Then
    WshShell.Run "php -S localhost:8080", 0, False
    WScript.Sleep 800
End If

' Open default browser directly to the web app
WshShell.Run "http://localhost:8080"
