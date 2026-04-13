ARCHES := x86
# overrides to s9pk.mk must precede the include statement
include s9pk.mk


node_modules: package-lock.json
	npm ci

package-lock.json: package.json
	npm i

clean:
	@echo "Cleaning up build artifacts..."
	@rm -rf $(PACKAGE_ID).s9pk $(PACKAGE_ID)_x86_64.s9pk $(PACKAGE_ID)_aarch64.s9pk $(PACKAGE_ID)_riscv64.s9pk javascript node_modules
