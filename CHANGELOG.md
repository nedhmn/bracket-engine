# Changelog

## [0.2.1](https://github.com/nedhmn/tournament-engine/compare/v0.2.0...v0.2.1) (2026-11-09)


### Dependencies

* **deps:** update pnpm/action-setup action to v6.1.1 ([#64](https://github.com/nedhmn/tournament-engine/issues/64)) ([0d3e678](https://github.com/nedhmn/tournament-engine/commit/0d3e6789f2a2b446f34834dc7ebad656c5e8bbb8))

## [0.2.0](https://github.com/nedhmn/tournament-engine/compare/v0.1.1...v0.2.0) (2026-11-08)


### Features

* **demo:** rebuild in react around configure and watch ([#54](https://github.com/nedhmn/tournament-engine/issues/54)) ([678e46c](https://github.com/nedhmn/tournament-engine/commit/678e46c2d98bc8f5ba79a5c75a74d8128bc5409b))
* **demo:** run a full tournament in the browser ([#47](https://github.com/nedhmn/tournament-engine/issues/47)) ([c0667ef](https://github.com/nedhmn/tournament-engine/commit/c0667ef7761d17ffc7bacb69bd8907bbdcb3ae1c))
* **design-system:** add the shared design system package ([#52](https://github.com/nedhmn/tournament-engine/issues/52)) ([39b33f2](https://github.com/nedhmn/tournament-engine/commit/39b33f2e326d207388cd60ab3b1a5ae5581f1bd1))
* **engine:** add a pure tournament lifecycle ([#45](https://github.com/nedhmn/tournament-engine/issues/45)) ([57da3c9](https://github.com/nedhmn/tournament-engine/commit/57da3c9a7f6fb4cd8da413aaca32379cc61f8b04))
* **engine:** tell callers which results can be reopened ([#56](https://github.com/nedhmn/tournament-engine/issues/56)) ([2f777e4](https://github.com/nedhmn/tournament-engine/commit/2f777e425b4c01b1b83f93a001c924cbd55a41e5))


### Fixes

* **core:** pair swiss and drop losers like goat-format ([#41](https://github.com/nedhmn/tournament-engine/issues/41)) ([ad4a13d](https://github.com/nedhmn/tournament-engine/commit/ad4a13d0c0ae9f178e717e54d7c3070cd26e8e78))


### Refactors

* **engine:** move swiss tiebreakers into their own file ([#51](https://github.com/nedhmn/tournament-engine/issues/51)) ([eda97eb](https://github.com/nedhmn/tournament-engine/commit/eda97ebb2e9a500f24c77c496a38dd42313b9a68))
* extract packages/db and run the cli on the engine ([#46](https://github.com/nedhmn/tournament-engine/issues/46)) ([9f86012](https://github.com/nedhmn/tournament-engine/commit/9f8601259391e2938e1b6f6d17af6f404f1c7724))
* move core to packages/engine and rename packages ([#43](https://github.com/nedhmn/tournament-engine/issues/43)) ([2d18935](https://github.com/nedhmn/tournament-engine/commit/2d189359900c904e767a4cc26414c50574098859))


### Documentation

* drop third-party notices from license so github detects mit ([#11](https://github.com/nedhmn/tournament-engine/issues/11)) ([af76991](https://github.com/nedhmn/tournament-engine/commit/af76991a9d645304d3503d51289ad22afc4b07b3))
* rewrite the readme and docs around three ways to use it ([#59](https://github.com/nedhmn/tournament-engine/issues/59)) ([1e57709](https://github.com/nedhmn/tournament-engine/commit/1e577094ae8f12cf16e7ca8cbc8a65864e6dc016))


### Dependencies

* **deps:** lock file maintenance ([#10](https://github.com/nedhmn/tournament-engine/issues/10)) ([a500b59](https://github.com/nedhmn/tournament-engine/commit/a500b590f2a285e38b29ba0ab09f6f8c730d28a4))
* **deps:** pin dependencies ([#3](https://github.com/nedhmn/tournament-engine/issues/3)) ([8dbf8a7](https://github.com/nedhmn/tournament-engine/commit/8dbf8a78604b141345258bb862021a0ec61589ee))
* **deps:** update actions/setup-node action to v7.1.0 ([#21](https://github.com/nedhmn/tournament-engine/issues/21)) ([4923aa4](https://github.com/nedhmn/tournament-engine/commit/4923aa4a1ca621bf24f76629a2d0b0ad594b4ac9))
* **deps:** update dependency drizzle-orm to v0.45.4 ([#20](https://github.com/nedhmn/tournament-engine/issues/20)) ([25cbd12](https://github.com/nedhmn/tournament-engine/commit/25cbd12fa7beff82067135a6eaab56fd77883fe0))
* **deps:** update dependency knip to v6.35.1 ([#13](https://github.com/nedhmn/tournament-engine/issues/13)) ([1defc36](https://github.com/nedhmn/tournament-engine/commit/1defc364f198bc3df057956556739ac2426e3a97))
* **deps:** update dependency knip to v6.38.0 ([#17](https://github.com/nedhmn/tournament-engine/issues/17)) ([48466ad](https://github.com/nedhmn/tournament-engine/commit/48466ad122f124626c5eb2eec313ddd8b9c0582a))
* **deps:** update dependency knip to v6.39.0 ([#19](https://github.com/nedhmn/tournament-engine/issues/19)) ([258add0](https://github.com/nedhmn/tournament-engine/commit/258add0934b742874d0be6743a40ea4e518b20a3))
* **deps:** update dependency knip to v6.41.0 ([#22](https://github.com/nedhmn/tournament-engine/issues/22)) ([09878b4](https://github.com/nedhmn/tournament-engine/commit/09878b421cc29012de381dd6fa62f8dbd231668f))
* **deps:** update dependency knip to v6.42.1 ([#31](https://github.com/nedhmn/tournament-engine/issues/31)) ([135eab4](https://github.com/nedhmn/tournament-engine/commit/135eab496fcd734435619913d665a8ce07b3841c))
* **deps:** update dependency node to v24.22.0 ([#23](https://github.com/nedhmn/tournament-engine/issues/23)) ([059fcf7](https://github.com/nedhmn/tournament-engine/commit/059fcf72038249f82bd71f25544115dbe8fabceb))
* **deps:** update dependency node to v24.22.1 ([#28](https://github.com/nedhmn/tournament-engine/issues/28)) ([8f70079](https://github.com/nedhmn/tournament-engine/commit/8f70079462d2be4cc2e5bad9d67ff8795fb6f209))
* **deps:** update dependency pg to v8.23.1 ([#18](https://github.com/nedhmn/tournament-engine/issues/18)) ([989d022](https://github.com/nedhmn/tournament-engine/commit/989d022e45e2b100e32368c50c92bc3db8c59fc8))
* **deps:** update dependency turbo to v2.10.13 ([#15](https://github.com/nedhmn/tournament-engine/issues/15)) ([a7de416](https://github.com/nedhmn/tournament-engine/commit/a7de416763544b82e1847575883e4d3f41e9182c))
* **deps:** update dependency turbo to v2.11.10 ([#29](https://github.com/nedhmn/tournament-engine/issues/29)) ([b5a63b2](https://github.com/nedhmn/tournament-engine/commit/b5a63b2f09035cb661a9158ba4ca5adfd8d0c0d9))
* **deps:** update dependency turbo to v2.11.8 ([#25](https://github.com/nedhmn/tournament-engine/issues/25)) ([cd65088](https://github.com/nedhmn/tournament-engine/commit/cd650885567a9b4238ef0f4c5c4494049f2ba40a))
* **deps:** update drizzle ([#16](https://github.com/nedhmn/tournament-engine/issues/16)) ([ff8d58e](https://github.com/nedhmn/tournament-engine/commit/ff8d58eb11b246b5c97af308efc6abc6d049ff43))
* **deps:** update node.js to v26.12.0 ([#26](https://github.com/nedhmn/tournament-engine/issues/26)) ([c393304](https://github.com/nedhmn/tournament-engine/commit/c3933040a8b07ac327a1ee2b143581f0ceac0b52))
* **deps:** update node.js to v26.12.1 ([#30](https://github.com/nedhmn/tournament-engine/issues/30)) ([3be5754](https://github.com/nedhmn/tournament-engine/commit/3be575474b12c0cf6e5e7d164c72488971341e19))
* **deps:** update node.js to v26.8.2 ([#12](https://github.com/nedhmn/tournament-engine/issues/12)) ([862c6e5](https://github.com/nedhmn/tournament-engine/commit/862c6e554f1887254ac7633564889a632b650d11))
* **deps:** update oxlint to v1.88.0 ([#27](https://github.com/nedhmn/tournament-engine/issues/27)) ([7003f72](https://github.com/nedhmn/tournament-engine/commit/7003f72505f8eca3e42ba6a722238d5e7ed3ee15))
* **deps:** update pnpm to v11.25.0 ([#4](https://github.com/nedhmn/tournament-engine/issues/4)) ([bef1fee](https://github.com/nedhmn/tournament-engine/commit/bef1fee9545c6de6d05ed99ae67fe89b0bfe1d28))
* **deps:** update pnpm to v12 ([#8](https://github.com/nedhmn/tournament-engine/issues/8)) ([9b09a9c](https://github.com/nedhmn/tournament-engine/commit/9b09a9cbf9ae0f9b9fe0eb07d2d2801ebf8ae635))
* **deps:** update pnpm to v12.3.2 ([#9](https://github.com/nedhmn/tournament-engine/issues/9)) ([674e2d5](https://github.com/nedhmn/tournament-engine/commit/674e2d5048e1fd240586c5f528c5d9f49d4445a5))
* **deps:** update postgres docker tag to v18 ([#5](https://github.com/nedhmn/tournament-engine/issues/5)) ([d9e8442](https://github.com/nedhmn/tournament-engine/commit/d9e8442919b86b7142274005f4763fe5d40fd49b))

## [0.1.1](https://github.com/nedhmn/bracket-engine/compare/v0.1.0...v0.1.1) (2026-09-05)


### Documentation

* shorter readme, workspace readmes, install-and-run getting started ([3c37bb0](https://github.com/nedhmn/bracket-engine/commit/3c37bb0a1a7ecbc999411a090c1030ca21bd92a1))

## 0.1.0 (2026-09-05)


### Features

* initial public release of Bracket Engine ([242c3e1](https://github.com/nedhmn/bracket-engine/commit/242c3e1fb7b37bf0e8150eb466f8ff75c92c8aa4))
