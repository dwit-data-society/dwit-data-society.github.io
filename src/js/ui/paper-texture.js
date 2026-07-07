/**
 * ui/paper-texture.js — canvas noise applied to body::before.
 */

export function initPaperTexture() {
	const size = 300;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#e8e0d0';
	ctx.fillRect(0, 0, size, size);

	const imageData = ctx.getImageData(0, 0, size, size);
	const { data } = imageData;

	for (let i = 0; i < data.length; i += 4) {
		const noise = (Math.random() - 0.5) * 40;
		data[i] = Math.min(255, Math.max(0, data[i] + noise));
		data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
		data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
	}

	ctx.putImageData(imageData, 0, 0);

	const dataUrl = canvas.toDataURL('image/png');
	const styleEl = document.createElement('style');
	styleEl.textContent = `body::before { background-image: url(${dataUrl}); }`;
	document.head.appendChild(styleEl);
}
