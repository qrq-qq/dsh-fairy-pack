# Fairy Pack 一键安装（Windows）
$ErrorActionPreference = 'Stop'
$node = 'node'
if (-not (Get-Command $node -ErrorAction SilentlyContinue)) {
  $candidate = Get-ChildItem "$env:USERPROFILE\.dsh\dsh-runtimes" -Filter node.exe -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
  if ($candidate) { $node = $candidate } else {
    Write-Host '未找到 node.exe。请先安装 Node.js，或用 DSH 自带的 node 运行 install.mjs。' -ForegroundColor Red
    exit 1
  }
}
& $node (Join-Path $PSScriptRoot 'install.mjs') @args
