ARCHES ?= x86 arm riscv
# overrides to s9pk.mk must precede the include statement

# Use the SDK's build rules rather than a vendored copy — a stale local s9pk.mk
# drifts from the toolchain it drives.
#
# The rules live inside node_modules, which does not exist on a fresh checkout,
# so give make a way to produce it. GNU make remakes missing included files and
# then restarts itself, which bootstraps the dependencies before anything else
# runs. `-include` keeps the first pass quiet instead of erroring on the missing
# file.
SDK_MK := node_modules/@start9labs/start-sdk/s9pk.mk

$(SDK_MK): package.json package-lock.json
	npm ci
	@touch $@

-include $(SDK_MK)
