#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const resourcesDir = join(rootDir, 'resources');
const svgPath = join(resourcesDir, 'reasonance-icon.svg');

console.log('Generating Reasonance icons...');

// Check if we have the necessary tools
const hasRsvg = (() => {
	try {
		execSync('which rsvg-convert', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
})();

const hasConvert = (() => {
	try {
		execSync('which convert', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
})();

if (!hasRsvg) {
	console.error('❌ rsvg-convert not found. Please install librsvg:');
	console.error('   brew install librsvg');
	process.exit(1);
}

const sizes = [16, 32, 48, 128, 192, 256, 512, 1024];
const tempDir = join(resourcesDir, 'temp-icons');

try {
	mkdirSync(tempDir, { recursive: true });

	console.log('📐 Generating PNG files...');
	for (const size of sizes) {
		const output = join(tempDir, `icon-${size}.png`);
		execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" > "${output}"`);
		console.log(`  ✓ ${size}x${size}`);
	}

	// Create macOS .icns
	console.log('\n🍎 Creating macOS .icns file...');
	const iconsetDir = join(tempDir, 'reasonance.iconset');
	mkdirSync(iconsetDir, { recursive: true });

	execSync(`cp "${join(tempDir, 'icon-16.png')}" "${join(iconsetDir, 'icon_16x16.png')}"`);
	execSync(`cp "${join(tempDir, 'icon-32.png')}" "${join(iconsetDir, 'icon_16x16@2x.png')}"`);
	execSync(`cp "${join(tempDir, 'icon-32.png')}" "${join(iconsetDir, 'icon_32x32.png')}"`);
	execSync(`cp "${join(tempDir, 'icon-128.png')}" "${join(iconsetDir, 'icon_128x128.png')}"`);
	execSync(`cp "${join(tempDir, 'icon-256.png')}" "${join(iconsetDir, 'icon_128x128@2x.png')}"`);
	execSync(`cp "${join(tempDir, 'icon-256.png')}" "${join(iconsetDir, 'icon_256x256.png')}"`);
	execSync(`cp "${join(tempDir, 'icon-512.png')}" "${join(iconsetDir, 'icon_256x256@2x.png')}"`);
	execSync(`cp "${join(tempDir, 'icon-512.png')}" "${join(iconsetDir, 'icon_512x512.png')}"`);
	execSync(`cp "${join(tempDir, 'icon-1024.png')}" "${join(iconsetDir, 'icon_512x512@2x.png')}"`);

	execSync(`iconutil -c icns "${iconsetDir}" -o "${join(tempDir, 'reasonance.icns')}"`);
	execSync(`cp "${join(tempDir, 'reasonance.icns')}" "${join(resourcesDir, 'darwin', 'code.icns')}"`);
	console.log('  ✓ darwin/code.icns');

	// Create Windows .ico (if ImageMagick is available)
	if (hasConvert) {
		console.log('\n🪟 Creating Windows .ico file...');
		execSync(`convert "${join(tempDir, 'icon-16.png')}" "${join(tempDir, 'icon-32.png')}" "${join(tempDir, 'icon-48.png')}" "${join(tempDir, 'icon-256.png')}" "${join(resourcesDir, 'win32', 'code.ico')}"`);
		console.log('  ✓ win32/code.ico');
	} else {
		console.log('\n⚠️  ImageMagick not found, skipping Windows .ico generation');
		console.log('   Install with: brew install imagemagick');
	}

	// Create Linux PNG
	console.log('\n🐧 Creating Linux PNG...');
	execSync(`cp "${join(tempDir, 'icon-512.png')}" "${join(resourcesDir, 'linux', 'code.png')}"`);
	console.log('  ✓ linux/code.png');

	// Create Server/Web icons
	console.log('\n🌐 Creating Server/Web icons...');
	execSync(`cp "${join(tempDir, 'icon-192.png')}" "${join(resourcesDir, 'server', 'code-192.png')}"`);
	execSync(`cp "${join(tempDir, 'icon-512.png')}" "${join(resourcesDir, 'server', 'code-512.png')}"`);
	console.log('  ✓ server/code-192.png');
	console.log('  ✓ server/code-512.png');

	if (hasConvert) {
		execSync(`convert "${join(tempDir, 'icon-32.png')}" "${join(resourcesDir, 'server', 'favicon.ico')}"`);
		console.log('  ✓ server/favicon.ico');
	}

	// Cleanup
	console.log('\n🧹 Cleaning up temporary files...');
	execSync(`rm -rf "${tempDir}"`);

	console.log('\n✅ All icons generated successfully!');
	console.log('\nNext steps:');
	console.log('  1. Rebuild the application: npm run watch');
	console.log('  2. Restart VS Code to see the new icons');

} catch (error) {
	console.error('\n❌ Error generating icons:', error.message);
	process.exit(1);
}
