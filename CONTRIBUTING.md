# Contributions

Vela Components is not accepting external source-code contributions at the moment. Pull requests will be closed without merging, regardless of their quality. This policy is about the project structure, not the change or the person who submitted it.

## Why not

Vela Components is a shared library. Its packages are built into several Vela Tools products, so every change here ships in all of them, and changes are planned and released together with the products that depend on them. SenLab d.o.o. holds the copyright on all of the code and keeps it that way, so the packages can be used in each of those products under the terms that product ships under, and relicensed or reused across Vela Tools without asking every contributor. An external contribution would arrive under the EUPL alone, with the contributor keeping copyright on their lines, and every product built on the files it touched would inherit that. The usual solution is a contributor licence agreement, which Vela Components does not have yet. For now, code contributions remain closed.

## What is welcome

Everything that is not a code change, and all of it is genuinely useful.

**Bugs.** Open a [bug report](../../issues/new?template=bug-report.yaml). Include what you ran, what you expected, what happened instead, and the versions from `npm ls @vela-tools/ui @vela-tools/ngsi @vela-tools/ngsi-client`. Include the smallest component tree or adapter call that shows the problem, the broker and its version, and the broker response involved, without credentials or private data.

**Features.** Open a [feature request](../../issues/new?template=feature-request.yaml) describing the problem you need solved rather than the solution you have in mind.

**Documentation.** The [README](README.md) and the README of each package are part of the product. If one is wrong, unclear, or silent on the case you hit, say so in an [issue](../../issues/new?template=help.yaml).

## Security

Never report a security vulnerability through a public issue. A way to run script through data from a broker, to make an adapter send a request to a host it was not given, or to build a query that does something other than what the user entered is a security report, not a bug. Follow the [Vela Components security policy](https://github.com/vela-tools/components/security/policy), which takes reports privately through GitHub private vulnerability reporting and acknowledges them within two working days.
