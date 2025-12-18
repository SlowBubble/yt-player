
# m1a: a simple video player
- Create index.html and main.js
- Start with a button to select a folder where the webm video files are located
- After selecting the folder, start playing the videos
  - Adjust the video size to fit the browser window
- When a video is done, start playing the next video
- Use localStorage to track stats
  - key is the file name
  - value is a JSON string
    - opened: a boolean to indicate if the file has been opened previously
    - currentTime: the time when the video was last paused or skipped
- Add these keyboard shortcuts
  - space: pause/resume
  - k: pause/resume
  - left arrow: rewind 3.7 seconds
  - right arrow: forward 3.7 seconds
  - j: rewind 8 seconds
  - l: forward 8 seconds
  - up arrow: go to previous video
  - down arrow: go to next video
  - z: decrease playback rate by 0.2 (don't go below 0.2)
  - x: increase playback rate by 0.2
  - a: restore playback rate to 1
  
# m1b
- Sort the files by those that haven't been opened previously and play them first.
- Add keyboard shortcuts
 - 0 to adjust the seek from 0 of the video length

# m1c
- Shortcut:
  - 'Enter': open a text prompt for annotation
    - store the text in the local storage json in a field 'annotations', which is a list of {'timeMs': number, 'text': string}
- In the page before video folder is opened, display all annotations in a list 