
# Apparition Labs

Apparition Labs is a system monitoring application built with Tauri and React. It is designed to easily and simply monitor servers and provide
real-time notifications of any issues. It connects using standard web ports like 443 (HTTPS) or 8006 for Proxmox Virtual Environment. It uses TCP to directly ping servers if you choose not to use a cloudflare tunnel or other solution if desired. It uses standard GET requests to check the status of each server.






## License

[GPL 3.0](https://choosealicense.com/licenses/gpl-3.0/)


## Tech Stack

**Frontend:** Next.js, React, TailwindCSS, shadcn/ui

**Backend:** Tauri (Rust), SQLite


## Installation

This application is installed like any other tauri application. You can either download the DMG or EXE file from the releases page, or you can build it yourself. Building steps are listed below:

```bash
  npm install ApparitionLabs
  cd ApparitionLabs
  npm run build
  npm run tauri build
```
    
## FAQ

#### How does the app monitor and connect to servers?

The app uses a simple HTTP request to check the status of each server. It will also attempt to connect to the server's ports to ensure they are open.
TCP is also used to directly ping servers if you choose not to use a cloudflare tunnel or other solution if desired.


#### Does this pose a security risk?
No. As ApparitionLabs does not require software to be installed on the server that is being monitored, it is safe to use.
As the app is a client-side application, it does not have access to any sensitive information on the server. As aforementioned, it communicates using standard web ports like 443 (HTTPS) or 8006 for Proxmox Virtual Environment.

#### Do I need to pay for this?
No. ApparitionLabs is free and open source software. You can use it for free and modify it as you like.

#### Can I use this for commercial purposes?
Yes. You can use this for commercial purposes. However, you must comply with the GPL 3.0 license.

#### Can I use this to control servers?
At the time, this is not possible. However down the line this is planned to either have terminal capabilities or at least the ability to open SSH in your system terminal.

## Author

- [Samuel Dingle](https://www.github.com/TheApparition1)

