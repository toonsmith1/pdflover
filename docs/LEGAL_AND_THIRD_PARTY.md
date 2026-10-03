# Legal, Privacy & Third-Party Notices

This page summarizes the notices that accompany PDF Lover. It is a practical
distribution guide, not legal advice. The full license text controls when it
differs from this summary.

## PDF Lover

PDF Lover is distributed under the source-available terms in the repository
[LICENSE](../LICENSE). Those terms restrict redistribution and commercial use
and require the Partner Spotlight and attribution notices to remain present.

## Bundled fonts

- **TH Sarabun New:** GPL version 2 or later with the font embedding exception.
  See [fonts/LICENSE-TH-Sarabun-New.txt](../fonts/LICENSE-TH-Sarabun-New.txt).
- **Sarabun:** SIL Open Font License 1.1. See
  [fonts/LICENSE-Sarabun-OFL.txt](../fonts/LICENSE-Sarabun-OFL.txt).
- **Noto Sans JP:** SIL Open Font License 1.1. See
  [fonts/LICENSE-Noto-OFL.txt](../fonts/LICENSE-Noto-OFL.txt).

The font files may be bundled with the application under their licenses. Do
not sell the font files as a standalone product, and retain the corresponding
copyright and license notices.

## Python and frontend dependencies

PDF Lover uses open-source dependencies listed in `requirements.txt` and
`package.json`. Their upstream license notices remain applicable. Notices
included directly in this repository include:

- [ReportLab BSD license](../licenses/REPORTLAB-LICENSE.txt)
- [pypdfium2/PDFium notices](https://github.com/pypdfium2-team/pypdfium2#licensing)
- License metadata shipped by the Python wheels and npm packages

When distributing a self-contained binary bundle, include the license files
provided by the exact dependency versions used to build that bundle.

## Optional system software

- **Ghostscript** is not bundled by PDF Lover. It is optional for image-aware
  compression and must be installed separately under its own AGPL or
  commercial terms. See the [official Ghostscript FAQ](https://ghostscript.com/faq/).
- **WeasyPrint** uses system libraries such as Pango, Cairo, and GDK-PixBuf
  on some platforms. Their licenses apply when those libraries are installed
  or redistributed. PDF Lover does not copy those system libraries into the
  repository.

## Privacy and network behavior

Normal PDF operations run on the user's machine. The application can make
these external requests:

- GitHub raw/API endpoints for partner campaigns and release checks
- Partner or Unsplash/CDN URLs for recommendation card media
- The Typhoon OCR API only when the user configures an API key and invokes OCR

Uploaded documents are not sent to those services by ordinary local PDF
operations. OCR is the exception: page images are sent to Typhoon when the
user explicitly enables and uses that integration.

## Local security

The server is intended to bind to `127.0.0.1`. The API applies TrustedHost,
CORS, and Origin/Referer checks for state-changing requests. Users should not
expose the local server to a network without adding an appropriate access
control layer.

## Release checklist

Before publishing a release, retain:

1. `LICENSE`
2. The notices under `fonts/` and `licenses/`
3. License files for any bundled dependency binaries
4. The privacy/network disclosure in the README
5. The exact release version and source references for bundled fonts
