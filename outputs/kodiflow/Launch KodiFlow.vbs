Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = folder

' Start the KodiFlow server without leaving a command window open.
shell.Run "cmd /c node server.mjs", 0, False
WScript.Sleep 1500

' Open the landlord dashboard.
shell.Run "http://127.0.0.1:4174/?page=dashboard", 1, False
