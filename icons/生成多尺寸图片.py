from PIL import Image
import os

# 输入文件 & 输出文件夹
input_file = "icons\\icon.png"
output_dir = "icons"

# 要生成的尺寸
sizes = [72, 96, 128, 144, 152, 192, 384, 512]

# 确保输出目录存在
os.makedirs(output_dir, exist_ok=True)

# 打开原始图片
img = Image.open(input_file)

# 遍历生成不同尺寸
for size in sizes:
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    filename = f"icon-{size}x{size}.png"
    filepath = os.path.join(output_dir, filename)
    resized.save(filepath, "PNG")
    print(f"已生成: {filepath}")

print("✅ 所有图标生成完成！")
