demo: node_modules
	./node_modules/.bin/pm2 start -f demo.json

node_modules: package.json
	npm install --quiet

serve:
	python -m SimpleHTTPServer 3000

stop: node_modules
	./node_modules/.bin/pm2 kill

logs:
	./node_modules/.bin/pm2 logs

flush:
	./node_modules/.bin/pm2 flush


.PHONY: demo serve stop logs

