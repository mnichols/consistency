#!/bin/sh

#mkdir /usr/local/etc/nginx/sites-enabled
#mkdir /usr/local/etc/nginx/sites-available
rm -rf /usr/local/etc/nginx/sites-available/consistency
rm -rf /usr/local/etc/nginx/sites-enabled/consistency
cp ./nginx-config /usr/local/etc/nginx/sites-available
ln -s /usr/local/etc/nginx/sites-available/consistency /usr/local/etc/nginx/sites-enabled
nginx -t && nginx -s reload
