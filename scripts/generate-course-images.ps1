$ErrorActionPreference = "Stop"

$outDir = Join-Path $PSScriptRoot "..\\public\\course-images"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Add-Type -AssemblyName System.Drawing

function New-BrushGradient {
  param(
    [System.Drawing.RectangleF]$Rect,
    [System.Drawing.Color]$From,
    [System.Drawing.Color]$To,
    [float]$Angle = 35
  )
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($Rect, $From, $To, $Angle)
  $brush.WrapMode = [System.Drawing.Drawing2D.WrapMode]::TileFlipXY
  return $brush
}

function Draw-Background {
  param(
    [System.Drawing.Graphics]$g,
    [int]$w,
    [int]$h
  )

  $rect = New-Object System.Drawing.RectangleF 0,0,$w,$h
  $bgFrom = [System.Drawing.Color]::FromArgb(255, 26, 29, 32)   # #1A1D20
  $bgTo   = [System.Drawing.Color]::FromArgb(255, 43, 48, 53)   # #2B3035
  $bg = New-BrushGradient -Rect $rect -From $bgFrom -To $bgTo -Angle 28
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()

  # subtle noise-like grid
  $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(28, 233, 236, 239), 1)
  for ($x = 0; $x -lt $w; $x += 48) { $g.DrawLine($gridPen, $x, 0, $x, $h) }
  for ($y = 0; $y -lt $h; $y += 48) { $g.DrawLine($gridPen, 0, $y, $w, $y) }
  $gridPen.Dispose()

  # vignette
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(-($w*0.15), -($h*0.2), $w*1.3, $h*1.4) | Out-Null
  $pbrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
  $pbrush.CenterColor = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
  $pbrush.SurroundColors = @([System.Drawing.Color]::FromArgb(160, 0, 0, 0))
  $g.FillRectangle($pbrush, 0, 0, $w, $h)
  $pbrush.Dispose()
  $path.Dispose()
}

function New-Pen {
  param([int]$a,[int]$r,[int]$g,[int]$b,[float]$w)
  $p = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb($a,$r,$g,$b), $w)
  $p.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $p.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $p.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  return $p
}

function Draw-NeuralNet {
  param([System.Drawing.Graphics]$g,[int]$w,[int]$h)
  $accent = New-Pen 210 217 37 42 6
  $muted  = New-Pen 140 233 236 239 4
  $nodeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 233, 236, 239))
  $nodeAccent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 217, 37, 42))

  $cx = [int]($w*0.66); $cy = [int]($h*0.52)
  $r = [int]([Math]::Min($w,$h)*0.28)
  $layers = @(
    @([System.Drawing.PointF]::new($cx-$r*0.75,$cy-$r*0.55), [System.Drawing.PointF]::new($cx-$r*0.75,$cy), [System.Drawing.PointF]::new($cx-$r*0.75,$cy+$r*0.55)),
    @([System.Drawing.PointF]::new($cx-$r*0.10,$cy-$r*0.65), [System.Drawing.PointF]::new($cx-$r*0.10,$cy-$r*0.22), [System.Drawing.PointF]::new($cx-$r*0.10,$cy+$r*0.22), [System.Drawing.PointF]::new($cx-$r*0.10,$cy+$r*0.65)),
    @([System.Drawing.PointF]::new($cx+$r*0.55,$cy-$r*0.55), [System.Drawing.PointF]::new($cx+$r*0.55,$cy), [System.Drawing.PointF]::new($cx+$r*0.55,$cy+$r*0.55))
  )

  for ($i=0; $i -lt $layers.Count-1; $i++) {
    foreach ($a in $layers[$i]) {
      foreach ($b in $layers[$i+1]) {
        $g.DrawLine($muted, $a, $b)
      }
    }
  }

  foreach ($p in $layers[0]) { $g.FillEllipse($nodeBrush, $p.X-10, $p.Y-10, 20, 20) }
  foreach ($p in $layers[1]) { $g.FillEllipse($nodeBrush, $p.X-9, $p.Y-9, 18, 18) }
  foreach ($p in $layers[2]) { $g.FillEllipse($nodeBrush, $p.X-10, $p.Y-10, 20, 20) }
  $g.FillEllipse($nodeAccent, $layers[2][1].X-12, $layers[2][1].Y-12, 24, 24)

  # underline accent stroke
  $g.DrawLine($accent, $w*0.14, $h*0.78, $w*0.56, $h*0.78)

  $accent.Dispose(); $muted.Dispose(); $nodeBrush.Dispose(); $nodeAccent.Dispose()
}

function Draw-Shield {
  param([System.Drawing.Graphics]$g,[int]$w,[int]$h)
  $accent = New-Pen 220 217 37 42 7
  $muted  = New-Pen 150 233 236 239 5
  $x = $w*0.62; $y = $h*0.22; $sw = $w*0.22; $sh = $h*0.54

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddBezier($x+$sw*0.5, $y, $x+$sw*0.88, $y+$sh*0.08, $x+$sw*0.98, $y+$sh*0.28, $x+$sw*0.82, $y+$sh*0.52) | Out-Null
  $path.AddBezier($x+$sw*0.82, $y+$sh*0.52, $x+$sw*0.70, $y+$sh*0.74, $x+$sw*0.58, $y+$sh*0.88, $x+$sw*0.5, $y+$sh) | Out-Null
  $path.AddBezier($x+$sw*0.5, $y+$sh, $x+$sw*0.42, $y+$sh*0.88, $x+$sw*0.30, $y+$sh*0.74, $x+$sw*0.18, $y+$sh*0.52) | Out-Null
  $path.AddBezier($x+$sw*0.18, $y+$sh*0.52, $x+$sw*0.02, $y+$sh*0.28, $x+$sw*0.12, $y+$sh*0.08, $x+$sw*0.5, $y) | Out-Null

  $g.DrawPath($muted, $path)
  $g.DrawLine($accent, $x+$sw*0.34, $y+$sh*0.52, $x+$sw*0.48, $y+$sh*0.66)
  $g.DrawLine($accent, $x+$sw*0.48, $y+$sh*0.66, $x+$sw*0.70, $y+$sh*0.36)

  $g.DrawLine($muted, $w*0.14, $h*0.78, $w*0.56, $h*0.78)
  $accent.Dispose(); $muted.Dispose(); $path.Dispose()
}

function Draw-Code {
  param([System.Drawing.Graphics]$g,[int]$w,[int]$h)
  $accent = New-Pen 220 217 37 42 7
  $muted  = New-Pen 150 233 236 239 5
  $cx = $w*0.66; $cy = $h*0.50

  # brackets
  $g.DrawArc($muted, $cx-170, $cy-90, 90, 180, 90, 180)
  $g.DrawArc($muted, $cx+80,  $cy-90, 90, 180, 270, 180)

  # slash
  $g.DrawLine($accent, $cx-10, $cy-90, $cx-60, $cy+90)

  # underline
  $g.DrawLine($muted, $w*0.14, $h*0.78, $w*0.56, $h*0.78)
  $accent.Dispose(); $muted.Dispose()
}

function Draw-Flow {
  param([System.Drawing.Graphics]$g,[int]$w,[int]$h)
  $accent = New-Pen 220 217 37 42 7
  $muted  = New-Pen 150 233 236 239 5
  $fill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(18, 233, 236, 239))

  $bx = $w*0.58; $by = $h*0.22
  $bw = $w*0.25; $bh = $h*0.11

  $rect1 = New-Object System.Drawing.RectangleF $bx, $by, $bw, $bh
  $rect2 = New-Object System.Drawing.RectangleF ($bx+($bw*0.08)), ($by+($bh*1.8)), $bw, $bh
  $rect3 = New-Object System.Drawing.RectangleF ($bx+($bw*0.16)), ($by+($bh*3.6)), $bw, $bh

  $g.FillRectangle($fill, $rect1); $g.DrawRectangle($muted, [System.Drawing.Rectangle]::Round($rect1))
  $g.FillRectangle($fill, $rect2); $g.DrawRectangle($muted, [System.Drawing.Rectangle]::Round($rect2))
  $g.FillRectangle($fill, $rect3); $g.DrawRectangle($muted, [System.Drawing.Rectangle]::Round($rect3))

  $g.DrawLine($accent, $rect1.Left + $rect1.Width/2, $rect1.Bottom+10, $rect2.Left + $rect2.Width/2, $rect2.Top-10)
  $g.DrawLine($accent, $rect2.Left + $rect2.Width/2, $rect2.Bottom+10, $rect3.Left + $rect3.Width/2, $rect3.Top-10)

  $g.DrawLine($muted, $w*0.14, $h*0.78, $w*0.56, $h*0.78)
  $fill.Dispose(); $accent.Dispose(); $muted.Dispose()
}

function Draw-Cloud {
  param([System.Drawing.Graphics]$g,[int]$w,[int]$h)
  $accent = New-Pen 220 217 37 42 7
  $muted  = New-Pen 150 233 236 239 5
  $x = $w*0.58; $y = $h*0.30; $cw = $w*0.28; $ch = $h*0.30
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x+$cw*0.10, $y+$ch*0.30, $cw*0.35, $ch*0.60, 180, 180) | Out-Null
  $path.AddArc($x+$cw*0.28, $y+$ch*0.10, $cw*0.40, $ch*0.70, 200, 170) | Out-Null
  $path.AddArc($x+$cw*0.55, $y+$ch*0.30, $cw*0.35, $ch*0.60, 180, 180) | Out-Null
  $path.AddLine($x+$cw*0.80, $y+$ch*0.90, $x+$cw*0.20, $y+$ch*0.90) | Out-Null
  $g.DrawPath($muted, $path)

  # small accent nodes
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,217,37,42))
  $g.FillEllipse($brush, $x+$cw*0.26, $y+$ch*0.64, 10, 10)
  $g.FillEllipse($brush, $x+$cw*0.52, $y+$ch*0.54, 12, 12)
  $brush.Dispose()

  $g.DrawLine($accent, $w*0.14, $h*0.78, $w*0.56, $h*0.78)
  $accent.Dispose(); $muted.Dispose(); $path.Dispose()
}

function Draw-Database {
  param([System.Drawing.Graphics]$g,[int]$w,[int]$h)
  $accent = New-Pen 220 217 37 42 7
  $muted  = New-Pen 150 233 236 239 5
  $x = $w*0.62; $y = $h*0.22; $dw = $w*0.22; $dh = $h*0.50

  $top = New-Object System.Drawing.RectangleF $x, $y, $dw, ($dh * 0.22)
  $mid1 = New-Object System.Drawing.RectangleF $x, ($y + ($dh * 0.18)), $dw, ($dh * 0.22)
  $mid2 = New-Object System.Drawing.RectangleF $x, ($y + ($dh * 0.36)), $dw, ($dh * 0.22)
  $bot = New-Object System.Drawing.RectangleF $x, ($y + ($dh * 0.54)), $dw, ($dh * 0.22)

  $g.DrawEllipse($muted, [System.Drawing.Rectangle]::Round($top))
  $g.DrawLine($muted, $x, ($y + ($dh * 0.11)), $x, ($y + ($dh * 0.65)))
  $g.DrawLine($muted, ($x + $dw), ($y + ($dh * 0.11)), ($x + $dw), ($y + ($dh * 0.65)))
  $g.DrawEllipse($muted, [System.Drawing.Rectangle]::Round($mid1))
  $g.DrawEllipse($muted, [System.Drawing.Rectangle]::Round($mid2))
  $g.DrawEllipse($muted, [System.Drawing.Rectangle]::Round($bot))

  $g.DrawLine($accent, ($x + ($dw * 0.20)), ($y + ($dh * 0.80)), ($x + ($dw * 0.80)), ($y + ($dh * 0.80)))
  $g.DrawLine($muted, $w*0.14, $h*0.78, $w*0.56, $h*0.78)
  $accent.Dispose(); $muted.Dispose()
}

function Draw-Blocks {
  param([System.Drawing.Graphics]$g,[int]$w,[int]$h)
  $accent = New-Pen 220 217 37 42 7
  $muted  = New-Pen 150 233 236 239 5
  $fill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(18, 233, 236, 239))

  $x = ($w * 0.58); $y = ($h * 0.28); $s = ($w * 0.08)
  $rects = @(
    (New-Object System.Drawing.RectangleF $x, $y, ($s * 1.4), ($s * 1.1)),
    (New-Object System.Drawing.RectangleF ($x + ($s * 1.6)), ($y + ($s * 0.2)), ($s * 1.4), ($s * 1.1)),
    (New-Object System.Drawing.RectangleF ($x + ($s * 0.8)), ($y + ($s * 1.35)), ($s * 1.4), ($s * 1.1))
  )
  foreach ($r in $rects) { $g.FillRectangle($fill, $r); $g.DrawRectangle($muted, [System.Drawing.Rectangle]::Round($r)) }
  $g.DrawLine($accent, $rects[0].Right, ($rects[0].Top + ($rects[0].Height / 2)), $rects[1].Left, ($rects[1].Top + ($rects[1].Height / 2)))
  $g.DrawLine($accent, ($rects[0].Left + ($rects[0].Width / 2)), $rects[0].Bottom, ($rects[2].Left + ($rects[2].Width / 2)), $rects[2].Top)

  $g.DrawLine($muted, $w*0.14, $h*0.78, $w*0.56, $h*0.78)
  $fill.Dispose(); $accent.Dispose(); $muted.Dispose()
}

function Draw-Pipeline {
  param([System.Drawing.Graphics]$g,[int]$w,[int]$h)
  $accent = New-Pen 220 217 37 42 7
  $muted  = New-Pen 150 233 236 239 5
  $fill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(18, 233, 236, 239))

  $x = $w*0.58; $y = $h*0.42
  for ($i=0; $i -lt 4; $i++) {
    $r = New-Object System.Drawing.RectangleF ($x + $i*110), ($y - (($i%2)*55)), 88, 44
    $g.FillRectangle($fill, $r)
    $g.DrawRectangle($muted, [System.Drawing.Rectangle]::Round($r))
    if ($i -lt 3) {
      $g.DrawLine($accent, $r.Right+10, $r.Top+$r.Height/2, $r.Right+92, $r.Top+$r.Height/2)
    }
  }
  $g.DrawLine($muted, $w*0.14, $h*0.78, $w*0.56, $h*0.78)
  $fill.Dispose(); $accent.Dispose(); $muted.Dispose()
}

function Draw-Mobile {
  param([System.Drawing.Graphics]$g,[int]$w,[int]$h)
  $accent = New-Pen 220 217 37 42 7
  $muted  = New-Pen 150 233 236 239 5
  $x = $w*0.66; $y = $h*0.22; $mw = $w*0.16; $mh = $h*0.56
  $rect = New-Object System.Drawing.RectangleF $x, $y, $mw, $mh
  $g.DrawRectangle($muted, [System.Drawing.Rectangle]::Round($rect))
  $g.DrawLine($muted, $x+$mw*0.12, $y+$mh*0.18, $x+$mw*0.88, $y+$mh*0.18)
  $g.DrawLine($muted, $x+$mw*0.12, $y+$mh*0.30, $x+$mw*0.70, $y+$mh*0.30)
  $g.DrawEllipse($accent, $x+$mw*0.43, $y+$mh*0.86, $mw*0.14, $mw*0.14)
  $g.DrawLine($muted, $w*0.14, $h*0.78, $w*0.56, $h*0.78)
  $accent.Dispose(); $muted.Dispose()
}

function Draw-Wireframes {
  param([System.Drawing.Graphics]$g,[int]$w,[int]$h)
  $accent = New-Pen 220 217 37 42 7
  $muted  = New-Pen 150 233 236 239 5
  $fill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(18, 233, 236, 239))

  $x = $w*0.58; $y = $h*0.26; $ww = $w*0.26; $wh = $h*0.42
  $r = New-Object System.Drawing.RectangleF $x,$y,$ww,$wh
  $g.FillRectangle($fill, $r)
  $g.DrawRectangle($muted, [System.Drawing.Rectangle]::Round($r))
  $g.DrawLine($muted, $x+$ww*0.06, $y+$wh*0.18, $x+$ww*0.94, $y+$wh*0.18)
  $g.DrawLine($muted, $x+$ww*0.06, $y+$wh*0.30, $x+$ww*0.68, $y+$wh*0.30)
  $g.DrawRectangle($muted, [System.Drawing.Rectangle]::Round((New-Object System.Drawing.RectangleF ($x+$ww*0.06), ($y+$wh*0.42), ($ww*0.52), ($wh*0.18))))
  $g.DrawRectangle($accent, [System.Drawing.Rectangle]::Round((New-Object System.Drawing.RectangleF ($x+$ww*0.62), ($y+$wh*0.42), ($ww*0.32), ($wh*0.18))))
  $g.DrawLine($muted, $w*0.14, $h*0.78, $w*0.56, $h*0.78)
  $fill.Dispose(); $accent.Dispose(); $muted.Dispose()
}

function New-CourseImage {
  param(
    [string]$name,
    [scriptblock]$drawFn
  )
  $w = 1200
  $h = 600
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  Draw-Background -g $g -w $w -h $h
  & $drawFn $g $w $h

  $path = Join-Path $outDir $name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Host "Wrote $path"
}

# Generate required images (2:1 aspect ratio, consistent style)
New-CourseImage -name "ai.png" -drawFn ${function:Draw-NeuralNet}
New-CourseImage -name "cybersecurity.png" -drawFn ${function:Draw-Shield}
New-CourseImage -name "web-development.png" -drawFn ${function:Draw-Code}
New-CourseImage -name "dsa.png" -drawFn ${function:Draw-Flow}
New-CourseImage -name "cloud.png" -drawFn ${function:Draw-Cloud}
New-CourseImage -name "database.png" -drawFn ${function:Draw-Database}
New-CourseImage -name "software-engineering.png" -drawFn ${function:Draw-Blocks}
New-CourseImage -name "devops.png" -drawFn ${function:Draw-Pipeline}
New-CourseImage -name "mobile-development.png" -drawFn ${function:Draw-Mobile}
New-CourseImage -name "ui-ux.png" -drawFn ${function:Draw-Wireframes}
New-CourseImage -name "default-course.png" -drawFn ${function:Draw-Blocks}

