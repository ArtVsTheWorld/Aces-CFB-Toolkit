param(
  [Parameter(Mandatory = $true)][uint32]$TaskProcessId,
  [ValidateRange(1, 60)][int]$Seconds = 45,
  [ValidateRange(1, 32)][int]$MaxGiB = 12,
  [ValidateRange(0, 34359738368)][long]$SkipBytes = 0,
  [string]$OutputPath,
  [ValidateCount(1, 40)]
  [ValidateSet('Gear', 'ArmSleeve_', 'Backplate_', 'Flakjacket_', 'KneePad_', 'OakleyPrizm', 'G_', 'NeckWear_', 'FaceMarks_', 'FaceGear_', 'GearMouthpiece_', 'GearFootwear_', 'GearArmSleeve_', 'GearNeckpad_', 'Neckwear_', 'ElbowGear_', 'GearLegBase_', 'GearLegsBase_', 'GuardianCap_', 'Towel_', 'Towel2_', 'ThighPad_', 'G_CompressionT_', 'GearWrist_', 'Gear_Socks_', 'Gear_JerseyStyle_', 'GearHand_', 'ArmTattoo_', 'LegTattoo_', 'CujoMatty_', 'CM_', 'Gear_Undershirt_', 'GearHelmet_', 'GearFaceMask_', 'Handwarmer_', 'Waist_', 'GearSpats_', 'GearBicep_', 'GearKneeBrace_', 'GearBackplate_')][string[]]$Prefix = @('FaceMarks_')
)
$ErrorActionPreference = 'Stop'
if (-not [Environment]::Is64BitProcess) { throw 'Run this diagnostic in 64-bit PowerShell.' }
$taskGame = Get-Process -Id $TaskProcessId
if ($taskGame.ProcessName -ne 'CollegeFB27') { throw 'This diagnostic only reads the CollegeFB27 game process.' }
# Ordinary read/query rights only. No writes, injection, privilege changes,
# process suspension, protection changes, or full memory dumps.
$taskDefinition = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;

public static class CfbEquipmentMemory {
  [StructLayout(LayoutKind.Sequential)] struct MemoryInfo {
    public IntPtr BaseAddress, AllocationBase;
    public uint AllocationProtect;
    public UIntPtr RegionSize;
    public uint State, Protect, Type;
  }
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, uint processId);
  [DllImport("kernel32.dll", SetLastError=true)] static extern UIntPtr VirtualQueryEx(IntPtr process, IntPtr address, out MemoryInfo info, UIntPtr length);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool ReadProcessMemory(IntPtr process, IntPtr address, byte[] buffer, UIntPtr size, out UIntPtr read);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  public class Match {
    public string Name { get; set; }
    public int Occurrences { get; set; }
    public HashSet<string> Encodings { get; set; } = new HashSet<string>();
    public HashSet<string> SampleAddresses { get; set; } = new HashSet<string>();
    public int JsonItemAssignments { get; set; }
    public int ResourcePaths { get; set; }
  }
  public class ScanResult {
    public uint ProcessId { get; set; }
    public string Prefix { get; set; }
    public long BytesRead { get; set; }
    public long SkippedBytes { get; set; }
    public long NextScanOffset { get; set; }
    public long EligibleBytes { get; set; }
    public int ReadableRegions { get; set; }
    public int ReadFailures { get; set; }
    public double ElapsedSeconds { get; set; }
    public bool Complete { get; set; }
    public string StopReason { get; set; }
    public List<Match> Matches { get; set; } = new List<Match>();
  }
  static bool NameChar(char c) { return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '_'; }
  static byte Lower(byte b) { return b >= 65 && b <= 90 ? (byte)(b + 32) : b; }
  static readonly Regex ItemAssignment = new Regex("\"itemAssetName\"\\s*:\\s*\"$", RegexOptions.Compiled | RegexOptions.IgnoreCase);
  static void FindNames(byte[] bytes, int size, ulong address, string[] prefixes, Dictionary<string, Match> matches) {
    var patterns = new Dictionary<byte, List<byte[]>>();
    foreach (string prefix in prefixes) {
      byte[] pattern = Encoding.ASCII.GetBytes(prefix.ToLowerInvariant());
      if (!patterns.ContainsKey(pattern[0])) patterns.Add(pattern[0], new List<byte[]>());
      patterns[pattern[0]].Add(pattern);
    }
    for (int index = 0; index < size; index++) {
      List<byte[]> candidates;
      if (!patterns.TryGetValue(Lower(bytes[index]), out candidates)) continue;
      int stride = index + 1 < size && bytes[index + 1] == 0 ? 2 : 1;
      // Do not promote a suffix of an artwork/resource identifier into an
      // exact ItemName (for example ArmTattoo_24 inside CM_ArmTattoo_24).
      if (index >= stride && NameChar((char)bytes[index - stride])) continue;
      foreach (byte[] pattern in candidates) {
      if (index + pattern.Length * stride > size) continue;
      bool found = true;
      for (int part = 0; part < pattern.Length; part++) {
        int offset = index + part * stride;
        if (Lower(bytes[offset]) != pattern[part] || stride == 2 && bytes[offset + 1] != 0) { found = false; break; }
      }
      if (!found) continue;
      int end = index;
      while (end < size && (end - index) / stride < 256 && NameChar((char)bytes[end]) && (stride == 1 || end + 1 < size && bytes[end + 1] == 0)) end += stride;
      // Ignore truncated or implausibly long names; only emit equipment tokens.
      if (end >= size || (end - index) / stride >= 256 || end <= index + pattern.Length * stride) continue;
      var name = new StringBuilder();
      for (int part = index; part < end; part += stride) name.Append((char)bytes[part]);
      string value = name.ToString();
      Match match;
      if (!matches.TryGetValue(value, out match)) {
        if (matches.Count >= 4096) continue;
        match = new Match { Name = value }; matches.Add(value, match);
      }
      match.Occurrences++; match.Encodings.Add(stride == 2 ? "UTF-16LE" : "ASCII/UTF-8");
      if (match.SampleAddresses.Count < 16) match.SampleAddresses.Add("0x" + (address + (ulong)index).ToString("X"));
      if (index >= stride && bytes[index - stride] == '/') match.ResourcePaths++;
      int from = Math.Max(0, index - 96 * stride);
      if (stride == 2 && (index - from) % 2 != 0) from++;
      string preceding = stride == 1 ? Encoding.ASCII.GetString(bytes, from, index - from) : Encoding.Unicode.GetString(bytes, from, index - from);
      if (ItemAssignment.IsMatch(preceding)) match.JsonItemAssignments++;
      index = end - 1;
      break;
      }
    }
  }
  public static ScanResult Scan(uint processId, int seconds, int maxGiB, long skipBytes, string[] prefixes) {
    IntPtr process = OpenProcess(0x0410, false, processId);
    if (process == IntPtr.Zero) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "Normal read/query access was denied; no protection bypass attempted.");
    var result = new ScanResult { ProcessId = processId, Prefix = String.Join(", ", prefixes), SkippedBytes = skipBytes, NextScanOffset = skipBytes };
    var clock = Stopwatch.StartNew();
    var regions = new List<MemoryInfo>();
    var matches = new Dictionary<string, Match>(StringComparer.Ordinal);
    const int chunk = 4 * 1024 * 1024, overlap = 512;
    long maxBytes = (long)maxGiB * 1024 * 1024 * 1024;
    try {
      ulong address = 0;
      while (address < 0x0000800000000000UL) {
        MemoryInfo info;
        if (VirtualQueryEx(process, new IntPtr((long)address), out info, new UIntPtr((uint)Marshal.SizeOf<MemoryInfo>())) == UIntPtr.Zero) break;
        ulong start = (ulong)info.BaseAddress.ToInt64(), length = info.RegionSize.ToUInt64(), next = start + length;
        if (length == 0 || next <= address) break;
        bool readable = info.State == 0x1000 && (info.Protect & 0x100) == 0 && (info.Protect & 0xEE) != 0;
        if (readable) { regions.Add(info); result.EligibleBytes += (long)length; }
        address = next;
      }
      // Heap/catalog data first; executable images last. Normal readable pages only.
      regions.Sort((a,b) => { int pa = a.Type == 0x20000 ? 0 : a.Type == 0x40000 ? 1 : 2, pb = b.Type == 0x20000 ? 0 : b.Type == 0x40000 ? 1 : 2; return pa != pb ? pa.CompareTo(pb) : a.BaseAddress.ToInt64().CompareTo(b.BaseAddress.ToInt64()); });
      result.ReadableRegions = regions.Count;
      byte[] buffer = new byte[chunk];
      long remainingSkip = skipBytes;
      foreach (var region in regions) {
        ulong start = (ulong)region.BaseAddress.ToInt64(), size = region.RegionSize.ToUInt64();
        if ((ulong)remainingSkip >= size) { remainingSkip -= (long)size; continue; }
        ulong offset = (ulong)remainingSkip; remainingSkip = 0;
        for (; offset < size;) {
          if (clock.Elapsed.TotalSeconds >= seconds || result.BytesRead >= maxBytes) { result.StopReason = clock.Elapsed.TotalSeconds >= seconds ? "time limit" : "byte limit"; goto Finished; }
          int wanted = (int)Math.Min((ulong)chunk, size - offset);
          wanted = (int)Math.Min(wanted, maxBytes - result.BytesRead);
          UIntPtr read;
          bool ok = ReadProcessMemory(process, new IntPtr((long)(start + offset)), buffer, new UIntPtr((uint)wanted), out read);
          int got = (int)Math.Min((ulong)wanted, read.ToUInt64());
          if (!ok) result.ReadFailures++;
          if (got > 0) { result.BytesRead += got; FindNames(buffer, got, start + offset, prefixes, matches); }
          ulong advanced = (ulong)(wanted > overlap && offset + (ulong)wanted < size ? wanted - overlap : wanted);
          offset += advanced; result.NextScanOffset += (long)advanced;
        }
      }
      result.Complete = true; result.StopReason = "all normally readable regions scanned";
      Finished:
      result.ElapsedSeconds = Math.Round(clock.Elapsed.TotalSeconds, 2);
      result.Matches.AddRange(matches.Values);
      result.Matches.Sort((a,b) => StringComparer.Ordinal.Compare(a.Name,b.Name));
      return result;
    } finally { CloseHandle(process); }
  }
}
'@
Add-Type -TypeDefinition $taskDefinition
$taskResult = [CfbEquipmentMemory]::Scan($TaskProcessId, $Seconds, $MaxGiB, $SkipBytes, $Prefix)
$taskJson = $taskResult | ConvertTo-Json -Depth 8
if ($OutputPath) {
  # Persist filtered equipment tokens and scan statistics, never raw memory.
  $taskResolvedOutput = [IO.Path]::GetFullPath($OutputPath)
  $taskOutputRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\outputs')) + [IO.Path]::DirectorySeparatorChar
  if (-not $taskResolvedOutput.StartsWith($taskOutputRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Output must stay inside the Toolkit outputs folder.' }
  [IO.File]::WriteAllText($taskResolvedOutput, $taskJson, [Text.UTF8Encoding]::new($false))
}
$taskJson
