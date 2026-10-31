name 'ai-management'
author 'TGIANN'
version '0.1.1' -- x-release-please-version
license 'GPL-3.0-only'
description 'Boss menu: employees and the society account of jobs and gangs'
repository 'https://github.com/aifivem/ai-management'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
server_script 'dist/server.js'


dependencies {
	'/onesync',
	'ai-core',
}

files {
	'locales/*.json',
	'data/points.json',
}
