param([Parameter(Mandatory=$true)][uint32]$TaskProcessId, [switch]$Table)
$ErrorActionPreference = 'Stop'
if ((Get-Process -Id $TaskProcessId).ProcessName -ne 'CollegeFB27') { throw 'Only CollegeFB27 is in scope.' }
# Read-only, short reads at previously recovered equipment-string addresses.
# Retain filtered equipment strings only, not surrounding bytes or memory dumps.
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
public static class CfbLabelProbe {
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, uint id);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool ReadProcessMemory(IntPtr p, IntPtr a, byte[] b, UIntPtr n, out UIntPtr read);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr p);
  public class Token { public int Offset; public string Address; public string Value; }
  public static List<Token> ReadTable(uint id, ulong start, int length) {
    if (length < 1 || length > 1048576) throw new ArgumentException("Bounded equipment string table only.");
    IntPtr p=OpenProcess(0x0410,false,id);
    if(p==IntPtr.Zero) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    try {
      byte[] b=new byte[length]; UIntPtr read;
      ReadProcessMemory(p,new IntPtr((long)start),b,new UIntPtr((uint)b.Length),out read);
      string text=Encoding.ASCII.GetString(b,0,(int)read.ToUInt64());
      var result=new List<Token>();
      foreach(System.Text.RegularExpressions.Match m in Regex.Matches(text,"(?<=\\x00)[ -~]{4,192}(?=\\x00)")) {
        if (!Regex.IsMatch(m.Value,"^(?:Gear|NeckWear_|FaceGear_|ElbowGear_|ArmTattoo_|LegTattoo_|ThighPad_|Towel2_|CujoMatty_)|turtleneck|balaclava|balaclave|ski ?mask|mouthpiece|pacifier|mouthguard|rubber ?band|tattoo|double sleeve",RegexOptions.IgnoreCase)) continue;
        result.Add(new Token{Offset=m.Index,Address="0x"+(start+(ulong)m.Index).ToString("X"),Value=m.Value});
      }
      return result;
    } finally {CloseHandle(p);}
  }
  public static List<Token> Read(uint id, ulong address) {
    IntPtr p=OpenProcess(0x0410,false,id);
    if(p==IntPtr.Zero) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    try {
      const int before=128; ulong start=address-before; byte[] b=new byte[640]; UIntPtr read;
      ReadProcessMemory(p,new IntPtr((long)start),b,new UIntPtr((uint)b.Length),out read);
      string text=Encoding.ASCII.GetString(b,0,(int)read.ToUInt64());
      var result=new List<Token>();
      foreach(System.Text.RegularExpressions.Match m in Regex.Matches(text,"[ -~]{5,192}")) {
        if (!Regex.IsMatch(m.Value,"turtleneck|balaclava|balaclave|ski ?mask|mouthpiece|pacifier|mouthguard|rubber ?band|tattoo|double sleeve|NXTRND|BATTLE|ThighPad_|Towel2_",RegexOptions.IgnoreCase)) continue;
        result.Add(new Token{Offset=m.Index-before,Address="0x"+(start+(ulong)m.Index).ToString("X"),Value=m.Value});
      }
      return result;
    } finally {CloseHandle(p);}
  }
}
'@
if ($Table) {
  [CfbLabelProbe]::ReadTable($TaskProcessId,0x2F6900000,0x70000) | ConvertTo-Json -Depth 4
  return
}
$taskEntries = @()
Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '..\outputs') -Filter 'runtime-equipment-colors-2026-10-02-*.json' | ForEach-Object {
  $taskScan = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
  if ($taskScan.ProcessId -ne $TaskProcessId) { return }
  foreach ($taskMatch in $taskScan.Matches) {
    if ($taskMatch.Name -notmatch '^NeckWear_Turtleneck_Tight[2-7]$|^GearMouthpiece_PacifierDualHanging_(SecondaryColor4|TeamColor([4-9]|10))$|^ElbowGear_RubberBands[1-3]$|^ArmTattoo_(24|25|34|35)$|^LegTattoo_TEST$|^GearNeckpad_|^GearArmSleeve_NikeProDriFitSleeve2|^ThighPad_|^Towel2_South$') { continue }
    foreach ($taskAddress in $taskMatch.SampleAddresses) {
      $taskEntries += [pscustomobject]@{ItemName=$taskMatch.Name;SampleAddress=$taskAddress;Tokens=[CfbLabelProbe]::Read($TaskProcessId,[Convert]::ToUInt64($taskAddress.Substring(2),16))}
    }
  }
}
$taskEntries | ConvertTo-Json -Depth 6
