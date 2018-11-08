FILES_common = \
  _locales/ja/messages.json \
  _locales/en/messages.json \
  background.js \
  content.js
FILES_chrome = \
  manifest.json.chrome \
  images/icon16.png \
  images/icon48.png \
  images/icon128.png
FILES_firefox = \
  manifest.json.firefox \
  images/icon.svg
KEY_chrome = \
  chrome.pem

all: copythisblock_firefox.zip copythisblock_chrome.zip
crx: copythisblock.crx

lint:
	npx eslint background.js content.js

clean:
	-rm -f copythisblock.crx copythisblock.pub copythisblock.sig copythisblock_chrome.zip copythisblock_firefox.zip

copythisblock_chrome.zip: $(FILES_chrome) $(FILES_common)
	t=`mktemp -d` && pax -rw -s'/\.chrome$$//' $^ "$$t" && (cd "$$t" && zip -r9 - *) > $@

copythisblock_firefox.zip: $(FILES_firefox) $(FILES_common)
	t=`mktemp -d` && pax -rw -s'/\.firefox$$//' $^ "$$t" && (cd "$$t" && zip -r9 - *) > $@

copythisblock.sig: copythisblock_chrome.zip $(KEY_chrome)
	openssl sha1 -sha1 -binary -sign $(KEY_chrome) < $< > $@
copythisblock.pub: $(KEY_chrome)
	openssl rsa -pubout -outform DER < $< > $@
copythisblock.crx: copythisblock.pub copythisblock.sig copythisblock_chrome.zip
	exec 1> $@ && ruby -e 'print ["Cr24",2,File.size(ARGV[0]),File.size(ARGV[1])].pack("a*VVV")' $^ && cat $^
