import os
import re
from bs4 import BeautifulSoup # 用于更健壮的HTML解析，需要安装：pip install beautifulsoup4

def inline_resources(html_file_path, output_file_path):
    """
    将HTML文件中的外部CSS和JS文件内联到HTML中。
    """
    if not os.path.exists(html_file_path):
        print(f"错误: HTML文件 '{html_file_path}' 不存在。")
        return

    base_dir = os.path.dirname(html_file_path)

    with open(html_file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')

    # 1. 内联 CSS 文件
    for link_tag in soup.find_all('link', rel='stylesheet'):
        href = link_tag.get('href')
        if href and not href.startswith('http') and not href.startswith('//'): # 只处理本地文件
            css_file_path = os.path.join(base_dir, href)
            if os.path.exists(css_file_path):
                print(f"内联 CSS: {href}")
                with open(css_file_path, 'r', encoding='utf-8') as css_f:
                    css_content = css_f.read()
                style_tag = soup.new_tag('style')
                style_tag.string = css_content
                link_tag.replace_with(style_tag)
            else:
                print(f"警告: CSS文件 '{css_file_path}' 不存在，跳过。")
        elif href and (href.startswith('http') or href.startswith('//')):
            print(f"跳过外部 CSS (CDN): {href}")
            # 如果是 CDN 资源（如 Chart.js），可能需要保留，或者下载后内联
            # 对于 Chart.js，建议保留 CDN 链接，因为它很大，内联会使文件过大。
            # 但如果希望完全离线，则需要下载 Chart.js 的 JS 文件，然后内联。
            pass

    # 2. 内联 JavaScript 文件
    # 注意：JS 文件的顺序很重要，BeautifulSoup 会保持原文档顺序
    for script_tag in soup.find_all('script', src=True): # 确保只处理有 src 属性的 script 标签
        src = script_tag.get('src')
        if src and not src.startswith('http') and not src.startswith('//'): # 只处理本地文件
            js_file_path = os.path.join(base_dir, src)
            if os.path.exists(js_file_path):
                print(f"内联 JS: {src}")
                with open(js_file_path, 'r', encoding='utf-8') as js_f:
                    js_content = js_f.read()
                # 清除 src 属性，直接插入内容
                del script_tag['src']
                script_tag.string = js_content
            else:
                print(f"警告: JS文件 '{js_file_path}' 不存在，跳过。")
        elif src and (src.startswith('http') or src.startswith('//')):
            print(f"跳过外部 JS (CDN): {src}")
            # 对于 Chart.js，建议保留 CDN 链接。
            # 如果需要完全离线，请将 Chart.js 下载到本地，然后将其路径添加到你的JS文件列表中进行内联。
            pass

    # 保存结果
    with open(output_file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"所有资源已缝合到 '{output_file_path}'。")

if __name__ == "__main__":
    # 假设你的 index.html 在当前目录
    input_html = "index.html"
    # 输出到新的文件，例如 packaged_index.html
    output_html = "packed_index.html"

    # 运行内联脚本
    inline_resources(input_html, output_html)

    print("\n请检查 'packed_index.html' 文件，并用浏览器打开测试。")
    print("注意：CDN 链接（如 Chart.js）默认被跳过，如果需要完全离线，请手动下载并内联这些资源。")