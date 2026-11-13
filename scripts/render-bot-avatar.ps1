Add-Type -AssemblyName System.Drawing

$size = 640
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.Clear([System.Drawing.Color]::FromArgb(255, 2, 44, 34))

$ring = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(110, 16, 185, 129)), 10
$g.DrawEllipse($ring, 28, 28, 584, 584)

$S = 10.6
function VX([double]$x) { return 320 + ($x - 24) * $S }
function VY([double]$y) { return 320 + ($y - 24) * $S }

$ink = [System.Drawing.Color]::FromArgb(255, 110, 231, 183)
$brush = New-Object System.Drawing.SolidBrush $ink

function NewPen([double]$width) {
  $pen = New-Object System.Drawing.Pen $ink, ($width * $S)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

$g.FillEllipse($brush, (VX 21.5), (VY 3.5), (5 * $S), (5 * $S))
$antenna = NewPen 2
$g.DrawLine($antenna, (VX 24), (VY 8.5), (VX 24), (VY 13))

$head = New-Object System.Drawing.Drawing2D.GraphicsPath
$hx = VX 11
$hy = VY 13
$hw = 26 * $S
$hh = 22 * $S
$hr = 7 * $S
$hd = $hr * 2
$head.AddArc($hx, $hy, $hd, $hd, 180, 90)
$head.AddArc(($hx + $hw - $hd), $hy, $hd, $hd, 270, 90)
$head.AddArc(($hx + $hw - $hd), ($hy + $hh - $hd), $hd, $hd, 0, 90)
$head.AddArc($hx, ($hy + $hh - $hd), $hd, $hd, 90, 90)
$head.CloseFigure()
$headPen = NewPen 2.2
$g.DrawPath($headPen, $head)

$g.FillEllipse($brush, (VX 16.4), (VY 20.4), (5.2 * $S), (5.2 * $S))
$g.FillEllipse($brush, (VX 26.4), (VY 20.4), (5.2 * $S), (5.2 * $S))

$mouth = NewPen 2
$g.DrawLine($mouth, (VX 19), (VY 29.5), (VX 29), (VY 29.5))

$ear = NewPen 2.2
$g.DrawLine($ear, (VX 11), (VY 21), (VX 11), (VY 27))
$g.DrawLine($ear, (VX 37), (VY 21), (VX 37), (VY 27))

$base = New-Object System.Drawing.Drawing2D.GraphicsPath
$base.AddLine((VX 17), (VY 35), (VX 17), (VY 38.5))
$br = 3 * $S
$base.AddArc((VX 17), (VY 35.5), ($br * 2), ($br * 2), 180, -90)
$base.AddLine((VX 20), (VY 41.5), (VX 28), (VY 41.5))
$base.AddArc((VX 25), (VY 35.5), ($br * 2), ($br * 2), 90, -90)
$base.AddLine((VX 31), (VY 38.5), (VX 31), (VY 35))
$basePen = NewPen 2.2
$g.DrawPath($basePen, $base)

$out = Join-Path (Get-Location) "public\tradelyt-bot.jpg"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose()
$bmp.Dispose()
Write-Output $out
