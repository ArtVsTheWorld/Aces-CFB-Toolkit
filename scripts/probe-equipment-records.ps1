param([Parameter(Mandatory=$true)][uint32]$TaskProcessId, [ValidateRange(1,60)][int]$Seconds=45, [ValidateRange(1,16)][int]$MaxGiB=3, [ValidateRange(0,34359738368)][long]$SkipBytes=0, [string]$OutputPath, [string]$ScanPath, [string]$ItemNamePattern='^NeckWear_Turtleneck_Tight[2-7]$|^GearMouthpiece_PacifierDualHanging_(SecondaryColor4|TeamColor([4-9]|10)|White[4-9])$|^ElbowGear_RubberBands[1-3]$|^ArmTattoo_(24|25|34|35)$|^ArmTattoo_Tattoos_Japanese_08|^LegTattoo_TEST$|^GearNeckpad_|^FaceGear_|^GearArmSleeve_NikeProDriFitSleeve2|^GearHand_glove_(Adizero11|UnderArmour(F6|Spotlight2019|Blur2))_|^ThighPad_|^Towel2_South$')
$ErrorActionPreference='Stop'
if ((Get-Process -Id $TaskProcessId).ProcessName -ne 'CollegeFB27') { throw 'Only CollegeFB27 is in scope.' }
# Ordinary read/query permissions, no writes, injection, elevation or raw dumps.
# Probe references to previously located equipment strings and retain filtered
# equipment labels with relative field offsets for structural cross-checking.
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
public static class CfbRecordProbe {
  [StructLayout(LayoutKind.Sequential)] struct MemoryInfo {
    public IntPtr BaseAddress, AllocationBase; public uint AllocationProtect;
    public UIntPtr RegionSize; public uint State, Protect, Type;
  }
  [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint a,bool i,uint p);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr n,out UIntPtr read);
  [DllImport("kernel32.dll",SetLastError=true)] static extern UIntPtr VirtualQueryEx(IntPtr p,IntPtr a,out MemoryInfo m,UIntPtr n);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr p);
  public class Label { public int FieldOffset; public string Address; public string Value; }
  public class Identifier { public string SearchedName,FullIdentifier,Address; }
  public class Record { public string ItemName,NamePointerAddress; public bool RepeatedNameFields; public List<Label> Labels=new List<Label>(); }
  public class Result { public long BytesRead,NextScanOffset; public bool Complete; public double Seconds; public int ReadFailures; public string StopReason; public List<Record> Records=new List<Record>(); public List<Identifier> Identifiers=new List<Identifier>(); }
  static byte[] Read(IntPtr p,ulong address,int size) {
    byte[] b=new byte[size];UIntPtr n;
    if(!ReadProcessMemory(p,new IntPtr((long)address),b,new UIntPtr((uint)size),out n)||n.ToUInt64()!=(ulong)size) return null;
    return b;
  }
  static string Text(IntPtr p,ulong address) {
    if(address<0x10000||address>=0x0000800000000000UL) return null;
    byte[] b=Read(p,address,192);if(b==null)return null;
    int end=0;while(end<b.Length&&b[end]>=32&&b[end]<=126)end++;
    if(end<4||end==b.Length||b[end]!=0)return null;
    string s=Encoding.ASCII.GetString(b,0,end);
    return Regex.IsMatch(s,"turtleneck|balaclava|balaclave|ski ?mask|mouthpiece|pacifier|mouthguard|rubber ?band|tattoo|CujoMatty|ArmTats|double sleeve|sleeve|collar|neck roll|NXTRND|BATTLE|LoadoutSlot|LoadoutAuthenticity|CharacterRoleType|band|brace|logo|shell|towel|beast|chosen|joker|lion|cheat|glove|adizero|under ?armour|nike|jordan|adidas|cleat|shoe|coach|football|mercurial|socks|undershirt|new balance|skullcap|necklace|facepaint|eye ?black|paint|tape|helmet|facemask|speedflex|axiom|schutt|vicis|riddell|light|handwarmer|waist|playcall|2 ?bar|3 ?bar|robot|^CM Generic|Japanese|Polynesian|^No |^None$",RegexOptions.IgnoreCase)?s:null;
  }
  static string FieldText(IntPtr p,ulong field) {
    byte[] b=Read(p,field,8);if(b==null)return null;
    return Text(p,BitConverter.ToUInt64(b,0))??Text(p,field);
  }
  public static Result Scan(uint id,int seconds,int maxGiB,long skipBytes,ulong[] addresses,string[] names) {
    IntPtr p=OpenProcess(0x0410,false,id);if(p==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    var result=new Result();var clock=Stopwatch.StartNew();var map=new Dictionary<ulong,string>();var counts=new Dictionary<string,int>();
    try {
      for(int i=0;i<addresses.Length;i++) {
        byte[] b=Read(p,addresses[i],names[i].Length+1);
        if(b!=null&&b[names[i].Length]==0&&Encoding.ASCII.GetString(b,0,names[i].Length)==names[i]) {
          map[addresses[i]]=names[i];
          byte[] prefix=Read(p,addresses[i]-64,64);int from=64;
          if(prefix!=null)while(from>0&&((prefix[from-1]>=65&&prefix[from-1]<=90)||(prefix[from-1]>=97&&prefix[from-1]<=122)||(prefix[from-1]>=48&&prefix[from-1]<=57)||prefix[from-1]==95))from--;
          string full=(prefix==null?"":Encoding.ASCII.GetString(prefix,from,64-from))+names[i];
          result.Identifiers.Add(new Identifier{SearchedName=names[i],FullIdentifier=full,Address="0x"+addresses[i].ToString("X")});
          if(full.StartsWith("CM_ArmTattoo_")){map.Remove(addresses[i]);map[addresses[i]-(ulong)(64-from)]=full;}
        }
      }
      // Short-string optimization can place ItemName/DisplayName text inside
      // the record itself. Treat this as a candidate, not automatic proof.
      foreach(var entry in map) {
        foreach(ulong offset in new ulong[]{0,96,160}) {
          ulong field=entry.Key+offset;
          if(FieldText(p,field)!=entry.Value)continue;
          string label=FieldText(p,field+56);
          if(label!=null)result.Records.Add(new Record{ItemName=entry.Value,NamePointerAddress="0x"+field.ToString("X"),RepeatedNameFields=FieldText(p,field-96)==entry.Value&&FieldText(p,field-160)==entry.Value,Labels=new List<Label>{new Label{FieldOffset=56,Address="0x"+(field+56).ToString("X"),Value=label}}});
        }
      }
      var regions=new List<MemoryInfo>();ulong a=0;
      while(a<0x0000800000000000UL) {
        MemoryInfo m;if(VirtualQueryEx(p,new IntPtr((long)a),out m,new UIntPtr((uint)Marshal.SizeOf<MemoryInfo>()))==UIntPtr.Zero)break;
        ulong start=(ulong)m.BaseAddress.ToInt64(),n=m.RegionSize.ToUInt64();if(n==0||start+n<=a)break;
        if(m.State==0x1000&&(m.Protect&0x100)==0&&(m.Protect&0xEE)!=0)regions.Add(m);a=start+n;
      }
      regions.Sort((x,y)=>{int px=x.Type==0x20000?0:1,py=y.Type==0x20000?0:1;return px!=py?px.CompareTo(py):x.BaseAddress.ToInt64().CompareTo(y.BaseAddress.ToInt64());});
      const int chunk=4*1024*1024;byte[] buffer=new byte[chunk];long limit=(long)maxGiB*1024*1024*1024, cursor=0;
      foreach(var m in regions) {
        ulong start=(ulong)m.BaseAddress.ToInt64(),length=m.RegionSize.ToUInt64();
        for(ulong off=0;off<length;off+=(ulong)chunk) {
          int wholeWant=(int)Math.Min((ulong)chunk,length-off);
          if(cursor+wholeWant<=skipBytes){cursor+=wholeWant;result.NextScanOffset=cursor;continue;}
          if(clock.Elapsed.TotalSeconds>seconds||result.BytesRead>=limit){result.StopReason="bounded scan limit";goto End;}
          int partial=(int)Math.Max(0,skipBytes-cursor),want=wholeWant-partial;cursor+=wholeWant;result.NextScanOffset=cursor;UIntPtr got;
          if(!ReadProcessMemory(p,new IntPtr((long)(start+off)+(long)partial),buffer,new UIntPtr((uint)want),out got))result.ReadFailures++;
          int size=(int)Math.Min((ulong)want,got.ToUInt64());result.BytesRead+=size;
          for(int pos=0;pos+8<=size;pos+=8) {
            ulong ptr=BitConverter.ToUInt64(buffer,pos);string name;if(!map.TryGetValue(ptr,out name))continue;
            int count;counts.TryGetValue(name,out count);if(count>=100)continue;counts[name]=count+1;
            ulong field=start+off+(ulong)partial+(ulong)pos;int before=name.StartsWith("CM_ArmTattoo_")?384:64;
            byte[] obj=Read(p,field-(ulong)before,before+192);if(obj==null)continue;
            var record=new Record{ItemName=name,NamePointerAddress="0x"+field.ToString("X"),RepeatedNameFields=FieldText(p,field-96)==name&&FieldText(p,field-160)==name};
            string inlineLabel=FieldText(p,field+56);
            if(inlineLabel!=null)record.Labels.Add(new Label{FieldOffset=56,Address="0x"+(field+56).ToString("X"),Value=inlineLabel});
            for(int j=0;j+8<=obj.Length;j+=8) {
              ulong other=BitConverter.ToUInt64(obj,j);if(other==ptr)continue;
              string label=Text(p,other);if(label!=null)record.Labels.Add(new Label{FieldOffset=j-before,Address="0x"+other.ToString("X"),Value=label});
            }
            if(record.Labels.Count>0)result.Records.Add(record);
          }
        }
      }
      result.Complete=true;result.StopReason="all normally readable regions scanned";
      End:result.Seconds=clock.Elapsed.TotalSeconds;return result;
    } finally{CloseHandle(p);}
  }
}
'@
$taskAddresses=[Collections.Generic.List[ulong]]::new()
$taskNames=[Collections.Generic.List[string]]::new()
$taskInputs = if ($ScanPath) { Get-Item -LiteralPath $ScanPath } else { Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '..\outputs') -Filter 'runtime-equipment-*-2026-10-02*.json' }
$taskInputs | ForEach-Object {
  $taskScan=Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
  if($taskScan.ProcessId -ne $TaskProcessId){return}
  foreach($taskMatch in $taskScan.Matches) {
    if($taskMatch.Name -notmatch $ItemNamePattern){continue}
    foreach($taskAddress in $taskMatch.SampleAddresses){$taskAddresses.Add([Convert]::ToUInt64($taskAddress.Substring(2),16));$taskNames.Add($taskMatch.Name)}
  }
}
$taskResult=[CfbRecordProbe]::Scan($TaskProcessId,$Seconds,$MaxGiB,$SkipBytes,$taskAddresses.ToArray(),$taskNames.ToArray())
$taskJson=$taskResult | ConvertTo-Json -Depth 7
if ($OutputPath) {
  $taskOutput=[IO.Path]::GetFullPath($OutputPath)
  $taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\outputs'))+[IO.Path]::DirectorySeparatorChar
  if(-not $taskOutput.StartsWith($taskRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'Output must remain inside Toolkit outputs.'}
  [IO.File]::WriteAllText($taskOutput,$taskJson,[Text.UTF8Encoding]::new($false))
}
$taskJson
