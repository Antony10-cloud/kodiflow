Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = folder

' Starting twice is harmless if KodiFlow is already running.
shell.Run "cmd /c node server.mjs", 0, False
WScript.Sleep 1500

' Open the platform administration dashboard directly.
shell.Run "http://127.0.0.1:4174/?page=admin", 1, False
