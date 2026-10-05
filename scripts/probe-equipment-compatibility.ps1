param([uint32]$TaskProcessId, [string]$RecordPath, [string]$OutputPath)
$ErrorActionPreference = 'Stop'
if ((Get-Process -Id $TaskProcessId).ProcessName -ne 'CollegeFB27') { throw 'Only CollegeFB27 is in scope.' }
# Read only verified ItemInfo records and bounded associated string/vector fields.
# No writes, injection, protection changes, or raw memory dumps.
Add-Type -TypeDefinition @'
using System; using System.Collections.Generic; using System.Text; using System.Runtime.InteropServices; using System.Text.RegularExpressions;
public static class CfbCompatProbe {
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint a,bool i,uint p);
 [DllImport("kernel32.dll")] static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr n,out UIntPtr read);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr p);
 public class Evidence { public string ItemName; public List<string> Tags=new List<string>(); public List<string> Locations=new List<string>(); }
 static byte[] Read(IntPtr p,ulong a,int n) { if(a<65536||a>=0x800000000000UL)return null;var b=new byte[n];UIntPtr got;return ReadProcessMemory(p,new IntPtr((long)a),b,new UIntPtr((uint)n),out got)&&got.ToUInt64()==(ulong)n?b:null; }
 static string Text(IntPtr p,ulong a) {var b=Read(p,a,128);if(b==null)return null;int n=0;while(n<b.Length&&b[n]>=32&&b[n]<127)n++; if(n<3||n==b.Length||b[n]!=0)return null;return Encoding.ASCII.GetString(b,0,n);}
 static void Check(IntPtr p,ulong a,string where,Evidence e) {var s=Text(p,a);if(s!=null&&Regex.IsMatch(s,"Facemasks$|^AirXP$|^LightGladiatorFacemasks$|^GuardianCap$|^HangingMouthpiece$|^LoadoutSlot_|^CharacterRoleType_")){if(!e.Tags.Contains(s)){e.Tags.Add(s);e.Locations.Add(where);}}}
 public static List<Evidence> Run(uint id,string[] names,ulong[] addresses) {
 var p=OpenProcess(0x0410,false,id);if(p==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());var output=new List<Evidence>();
 try { for(int i=0;i<names.Length;i++){var e=new Evidence{ItemName=names[i]};output.Add(e);var field=addresses[i];
 for(int off=-160;off<=384;off+=8){var a=field+(ulong)(long)off;var b=Read(p,a,16);if(b==null)continue;var ptr=BitConverter.ToUInt64(b,0);Check(p,ptr,"field "+off,e);Check(p,a,"inline "+off,e);
 var header=Read(p,ptr,48); if(header==null)continue;
 // Native pointer+count vectors and Frostbite arrays with count before data.
 var lengths=new List<int>{BitConverter.ToInt32(b,8)};var preceding=Read(p,ptr-8,8);if(preceding!=null){lengths.Add(BitConverter.ToInt32(preceding,0));lengths.Add(BitConverter.ToInt32(preceding,4));}
 foreach(var count in lengths) if(count>0&&count<=32){var values=Read(p,ptr,count*8);if(values==null)continue;for(int n=0;n<count;n++)Check(p,BitConverter.ToUInt64(values,n*8),"vector "+off+" entry "+n,e);}
 // A second pointer indirection sometimes wraps string arrays.
 for(int j=0;j<48;j+=8){var child=BitConverter.ToUInt64(header,j);Check(p,child,"indirect "+off+"/"+j,e);}
 }
 } return output; }finally{CloseHandle(p);}
 }
}
'@
$taskRecords = (Get-Content -LiteralPath $RecordPath -Raw | ConvertFrom-Json).Records | Where-Object { $_.RepeatedNameFields -and $_.ItemName -match '^Gear(FaceMask|Helmet)_' } | Group-Object ItemName | ForEach-Object { $_.Group[0] }
$taskNames = @($taskRecords | ForEach-Object ItemName)
$taskAddresses = @($taskRecords | ForEach-Object { [Convert]::ToUInt64($_.NamePointerAddress.Substring(2),16) })
$taskData = [CfbCompatProbe]::Run($TaskProcessId,[string[]]$taskNames,[ulong[]]$taskAddresses)
$taskTarget = [IO.Path]::GetFullPath($OutputPath)
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../outputs')) + [IO.Path]::DirectorySeparatorChar
if (-not $taskTarget.StartsWith($taskRoot,[StringComparison]::OrdinalIgnoreCase)) { throw 'Output must stay in outputs.' }
[IO.File]::WriteAllText($taskTarget,($taskData | ConvertTo-Json -Depth 6),[Text.UTF8Encoding]::new($false))
$taskData | Select-Object ItemName, Tags
