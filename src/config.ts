import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	name: "TAMAKARA",
	title: "TAMAKARA's Blog",
	subtitle: "",
	lang: "zh_CN", // 语言代码，例如 'en'、'zh_CN'、'ja' 等。
	themeColor: {
		hue: 250, // 主题色默认色相，范围为 0 到 360。例如红色：0，青绿色：200，青色：250，粉色：345
		fixed: false, // 隐藏访客的主题色选择器
	},
	banner: {
		enable: true, // 显示横幅图片
		src: "assets/images/demo-banner.png", // 相对于 /src 目录；如果以 '/' 开头，则相对于 /public 目录
		position: "center", // 等同于 object-position，仅支持 'top'、'center'、'bottom'。默认值为 'center'
		credit: {
			enable: false, // 显示横幅图片的署名文字
			text: "", // 要显示的署名文字
			url: "", // （可选）原始作品或艺术家的页面链接
		},
	},
	toc: {
		enable: true, // 在文章右侧显示目录
		depth: 2, // 目录中显示的最大标题层级，从 1 到 3
	},
	favicon: [
		// 保留这个数组为空即可使用默认 favicon
		// {
		//   src: '/favicon/icon.png',    // favicon 路径，相对于 /public 目录
		//   theme: 'light',              // （可选）只有在浅色/深色模式下使用不同 favicon 时才设置，可选值为 'light' 或 'dark'
		//   sizes: '32x32',              // （可选）favicon 尺寸，可根据需要设置不同大小
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		// {
		// 	name: "GitHub",
		// 	url: "https://github.com/saicaca/fuwari", // 内部链接不应包含基础路径，因为会自动添加
		// 	external: true, // 显示外链图标，并会在新标签页中打开
		// },
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/demo-avatar.png", // 相对于 /src 目录；如果以 '/' 开头，则相对于 /public 目录
	name: "魂辛カラ",
	bio: "喜欢计算机、数学、二次元、音乐和可爱的东西。",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github", // 图标代码可在 https://icones.js.org/ 查看
			// 如果尚未包含对应图标集，需要先安装它
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://github.com/tamakara", 
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// 注意：部分样式（例如背景色）会被覆盖，详情见 astro.config.mjs 文件。
	// 请选择深色主题，因为这个博客主题目前仅支持深色背景
	theme: "github-dark",
};
