Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceIcon = Join-Path $projectRoot 'src/renderer/assets/app-icon.png'
$outputImage = Join-Path $projectRoot 'build/portable-splash.bmp'

$canvas = [System.Drawing.Bitmap]::new(520, 230)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$icon = [System.Drawing.Image]::FromFile($sourceIcon)
$background = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(11, 21, 21))
$white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(242, 247, 244))
$muted = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(163, 185, 174))
$green = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(49, 200, 120))
$border = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(37, 72, 55), 2)
$titleFont = [System.Drawing.Font]::new('Bahnschrift', 24, [System.Drawing.FontStyle]::Bold)
$bodyFont = [System.Drawing.Font]::new('Segoe UI', 11, [System.Drawing.FontStyle]::Regular)
$tinyFont = [System.Drawing.Font]::new('Segoe UI', 9, [System.Drawing.FontStyle]::Regular)

try {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $graphics.FillRectangle($background, 0, 0, 520, 230)
  $graphics.DrawRectangle($border, 1, 1, 517, 227)
  $graphics.DrawImage($icon, 39, 40, 91, 91)
  $graphics.DrawString("ACE'S CFB TOOLKIT", $titleFont, $white, 151, 50)
  $graphics.DrawString('COLLEGE FOOTBALL 27', $tinyFont, $muted, 153, 91)
  $graphics.FillRectangle($green, 39, 158, 442, 3)
  $graphics.DrawString('Opening the portable app...', $bodyFont, $white, 40, 177)
  $graphics.DrawString('Please wait while files are prepared.', $tinyFont, $muted, 40, 201)
  $canvas.Save($outputImage, [System.Drawing.Imaging.ImageFormat]::Bmp)
} finally {
  $tinyFont.Dispose(); $bodyFont.Dispose(); $titleFont.Dispose()
  $border.Dispose(); $green.Dispose(); $muted.Dispose(); $white.Dispose(); $background.Dispose()
  $icon.Dispose(); $graphics.Dispose(); $canvas.Dispose()
}
