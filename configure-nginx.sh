#!/bin/sh

#mkdir /usr/local/etc/nginx/sites-enabled
#mkdir /usr/local/etc/nginx/sites-available
rm -rf /usr/local/etc/nginx/sites-available/consistency-nginx
rm -rf /usr/local/etc/nginx/sites-enabled/consistency-nginx
cp ./consistency-nginx /usr/local/etc/nginx/sites-available
ln -s /usr/local/etc/nginx/sites-available/consistency-nginx /usr/local/etc/nginx/sites-enabled
nginx -t && nginx -s reload
