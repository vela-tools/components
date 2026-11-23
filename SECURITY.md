# Security policy

Vela Components is a shared library: its packages are the user interface and the NGSI-LD client that several Vela Tools products, and any other application that installs them, are built on. They render data that comes from context brokers and send requests that read and change that data. A flaw in them is not contained in one product; it reaches every product and application built on them. This document explains how to report security vulnerabilities in Vela Components responsibly.

---

## Supported versions

Each package is versioned on its own. Only the latest release of each package receives security fixes.

---

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Report privately through [GitHub private vulnerability reporting](https://github.com/vela-tools/components/security/advisories/new), with:

- A description of the vulnerability
- Steps to reproduce, including the package versions, the broker and its version, the component or adapter call, and the broker response involved
- The versions from `npm ls @vela-tools/ui @vela-tools/ngsi @vela-tools/ngsi-client`
- Any potential impact you have identified
- Optionally, a suggested fix

Leave out real keys, tokens and private data.

You should receive an acknowledgement within **2 working days** (Monday to Friday, EU CET/CEST hours).

After triage, we will:

1. Confirm the vulnerability and determine its severity.
2. Develop and test a fix.
3. Coordinate a release that includes the fix.
4. Publicly disclose the vulnerability after users have had reasonable time to update.

---

## Disclosure timeline

We aim for the following timeline, though complex issues may take longer:

| Phase | Target |
|---|---|
| Initial response | 2 working days |
| Triage and severity assessment | 5 working days |
| Fix development and testing | 30 days for high/critical |
| Public disclosure | Within 90 days, or after fix is widely deployed |

We will keep you informed at each stage.

---

## Scope

This security policy covers:

- Code and dependencies in this repository
- Build and release artefacts published from this repository
- Documentation that could mislead users into insecure configurations

In Vela Components, that includes in particular:

- Script execution through values that come from a broker, in any component
- Queries (`q`, `geoQ`, `scopeQ`) built from user input that mean something other than what the user entered
- Requests to a host other than the broker the adapter was created for
- Broker responses that make the client write something the user did not ask for, such as an update that removes members of a subscription

This policy does **not** cover:

- Missing authentication or access control in the packages. They are a library, not an application: access control is the job of the broker and of the application that uses them
- Vulnerabilities in third-party software Vela Components depends on (please report those upstream)
- Issues with deployment infrastructure operated by individual users
- Social engineering, physical attacks, or denial-of-service against velacontext.com

---

## Recognition

We are happy to credit reporters in the release notes of the fix, unless you prefer to remain anonymous. Let us know your preference when you report.

We do not currently operate a paid bug bounty programme, but genuine security improvements are deeply appreciated and may be eligible for swag, public recognition, or commercial discounts on Vela Context Data Hub.

---

## Contact

- **Security reports:** [GitHub private vulnerability reporting](https://github.com/vela-tools/components/security/advisories/new)
- **General contact:** info@senlab.io
- **Commercial:** [velacontext.com/contact](https://velacontext.com/contactus)
