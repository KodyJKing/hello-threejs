export function easeInOutCubic( x ) {
    return x ** 2 * 3 - x ** 3 * 2
}

export function clamp( x, min, max ) {
    return Math.min( max, Math.max( min, x ) )
}

export function sawtooth( x, radius = 1, height = 1 ) {
    x = Math.abs( x ) / radius
    let rising = x % 2
    let falling = Math.max( 0, rising * 2 - 2 )
    return ( rising - falling ) * height
}

export function linearStep( x, edge0, edge1 ) {
    let w = edge1 - edge0
    let m = 1 / w // slope with a rise of 1
    let y0 = -m * edge0
    return clamp( y0 + m * x, 0, 1 )
}

export function stopGo( x, downtime, period ) {
    let cycle = ( x / period ) | 0
    let tween = x - cycle * period
    let linStep = linearStep( tween, downtime, period )
    return cycle + linStep
}

export function stopGoEased( x, downtime, period ) {
    let cycle = ( x / period ) | 0
    let tween = x - cycle * period
    let linStep = easeInOutCubic( linearStep( tween, downtime, period ) )
    return cycle + linStep
}