# React Zoom Viewer

## Overview

ZoomViewer* is a React component that enables zoom-in and zoom-out functionality for any child component it wraps. It is useful for displaying images, graphs, or any other visual elements that benefit from zooming.*

## Features

- Supports zoom-in and zoom-out functionality
- Works with any child component passed as \*children
- Smooth transitions for a better user experience
- Easy to integrate into any React project

## Usage

### ZoomViewer Component

```
<ZoomViewer>
  <img src="https://picsum.photos/2000/1000" />
</ZoomViewer>
```

### useZoomController

```
const { zoomIn, zoomOut, handleWheel } = useZoomController()

return (
<div className="flex flex-col gap-[10px]">
    <div className="flex items-center gap-[10px]">
    <Button size="S" onClick={zoomIn}>
        ZoomIn
    </Button>
    <Button size="S" onClick={zoomOut}>
        ZoomOut
    </Button>
    </div>
    <Carousel className="h-[500px] w-[500px]">
    <ZoomViewer
        className=" border-light-gray bg-smoke"
        onWheel={handleWheel}
    >
        <img
        className="object-contain"
        src="https://fastly.picsum.photos/id/1050/500/300.jpg?hmac=wXLHUriEWa0nDv-NJyzbrZ_FYY7odslz8vgMEYgtRt4"
        />
    </ZoomViewer>
    </Carousel>
</div>
)
```
