# Runs a command on a separate, invisible Windows desktop so the VS Code test window never appears on
# (or takes focus from) the user's screen. The desktop object goes away when the command ends.
#   powershell -NoProfile -ExecutionPolicy Bypass -File hidden-desktop.ps1 -Command "node test\e2e\runTest.js" -WorkDir <dir> -Log <file> [-TimeoutSec 900]
param(
  [Parameter(Mandatory = $true)][string]$Command,
  [Parameter(Mandatory = $true)][string]$WorkDir,
  [Parameter(Mandatory = $true)][string]$Log,
  [int]$TimeoutSec = 900
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class HiddenDesk {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct STARTUPINFO {
    public int cb; public string lpReserved; public string lpDesktop; public string lpTitle;
    public int dwX; public int dwY; public int dwXSize; public int dwYSize; public int dwXCountChars; public int dwYCountChars;
    public int dwFillAttribute; public int dwFlags; public short wShowWindow; public short cbReserved2;
    public IntPtr lpReserved2; public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }
  [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern IntPtr CreateDesktop(string lpszDesktop, IntPtr lpszDevice, IntPtr pDevmode, int dwFlags, uint dwDesiredAccess, IntPtr lpsa);
  [DllImport("user32.dll", SetLastError = true)] public static extern bool CloseDesktop(IntPtr hDesktop);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CreateProcess(string app, string cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string cwd, ref STARTUPINFO si, out PROCESS_INFORMATION pi);
  [DllImport("kernel32.dll")] public static extern uint WaitForSingleObject(IntPtr h, uint ms);
  [DllImport("kernel32.dll")] public static extern bool GetExitCodeProcess(IntPtr h, out uint code);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
}
"@

$name = "ullm-test-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
$desk = [HiddenDesk]::CreateDesktop($name, [IntPtr]::Zero, [IntPtr]::Zero, 0, 0x10000000, [IntPtr]::Zero)
if ($desk -eq [IntPtr]::Zero) { Write-Error "CreateDesktop failed"; exit 2 }
try {
  $si = New-Object HiddenDesk+STARTUPINFO
  $si.cb = [Runtime.InteropServices.Marshal]::SizeOf($si)
  $si.lpDesktop = "WinSta0\$name"
  $pi = New-Object HiddenDesk+PROCESS_INFORMATION
  $cmdline = "cmd.exe /d /s /c `"$Command > `"$Log`" 2>&1`""
  # CREATE_NO_WINDOW = 0x08000000
  if (-not [HiddenDesk]::CreateProcess([NullString]::Value, $cmdline, [IntPtr]::Zero, [IntPtr]::Zero, $false, 0x08000000, [IntPtr]::Zero, $WorkDir, [ref]$si, [ref]$pi)) {
    Write-Error ("CreateProcess failed: " + [Runtime.InteropServices.Marshal]::GetLastWin32Error()); exit 2
  }
  $wait = [HiddenDesk]::WaitForSingleObject($pi.hProcess, [uint32]($TimeoutSec * 1000))
  if ($wait -ne 0) { & taskkill.exe /T /F /PID $pi.dwProcessId | Out-Null; Write-Output "timeout"; exit 3 }
  $code = 0
  [void][HiddenDesk]::GetExitCodeProcess($pi.hProcess, [ref]$code)
  [void][HiddenDesk]::CloseHandle($pi.hProcess); [void][HiddenDesk]::CloseHandle($pi.hThread)
  Write-Output "exit $code"
  exit $code
} finally {
  [void][HiddenDesk]::CloseDesktop($desk)
}
