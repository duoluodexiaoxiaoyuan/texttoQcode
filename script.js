// 全局变量
let currentImageData = null;
let currentVideoData = null;
let currentQRCanvas = null;

// 显示提示信息
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    // 处理多行消息，将\n转换为<br>
    toast.innerHTML = message.replace(/\n/g, '<br>');
    toast.className = `toast ${type} show`;
    
    // 根据消息类型调整显示时间
    const displayTime = type === 'info' || type === 'warning' ? 5000 : 3000;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, displayTime);
}

// 生成文字二维码
function generateTextQR() {
    const textInput = document.getElementById('textInput');
    const text = textInput.value.trim();
    
    if (!text) {
        showToast('请输入要生成二维码的文字内容', 'warning');
        return;
    }
    
    // 检查文字长度
    if (text.length > 2200) {
        showToast(`文字内容过长(${text.length}字符)，建议缩短到2200字符以内`, 'warning');
        return;
    }
    
    try {
        // 创建临时div容器
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        // 使用QRCodeJS库生成二维码
        console.log('开始生成文字二维码，文本内容:', text);
        console.log('临时容器:', tempDiv);
        
        const qrcode = new QRCode(tempDiv, {
            text: text,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
        
        console.log('QRCode对象创建完成:', qrcode);
        
        // 等待二维码生成完成，增加更长的等待时间和重试机制
        let retryCount = 0;
        const maxRetries = 10;
        
        const checkQRCode = () => {
            const canvas = tempDiv.querySelector('canvas');
            const img = tempDiv.querySelector('img');
            
            console.log('检查二维码生成状态 - Canvas:', !!canvas, 'Img:', !!img, '重试次数:', retryCount);
            console.log('临时容器HTML内容:', tempDiv.innerHTML);
            console.log('QRCode对象内部结构:', qrcode);
            
            if (canvas || (img && img.src && img.src !== '')) {
                console.log('找到二维码元素，直接复制HTML内容');
                
                // 直接复制临时容器的HTML内容到显示容器
                displayQRCodeFromHTML(tempDiv.innerHTML, '文字内容');
                showToast('文字二维码生成成功！');
                
                // 清理临时元素
                document.body.removeChild(tempDiv);
            } else {
                // 尝试手动触发绘制
                if (qrcode && qrcode._oDrawing && typeof qrcode._oDrawing.draw === 'function') {
                    console.log('尝试手动绘制二维码');
                    try {
                        qrcode._oDrawing.draw(qrcode._oQRCode);
                        // 再次检查是否生成了元素
                        setTimeout(() => {
                            const newCanvas = tempDiv.querySelector('canvas');
                            const newImg = tempDiv.querySelector('img');
                            if (newCanvas) {
                                displayQRCode(newCanvas.cloneNode(true), '文字内容');
                                showToast('文字二维码生成成功！');
                            } else if (newImg && newImg.src) {
                                displayQRCodeFromImg(newImg.cloneNode(true), '文字内容');
                                showToast('文字二维码生成成功！');
                            } else {
                                // 如果还是没有，尝试直接创建canvas绘制
                                createCanvasDirectly(qrcode._oQRCode, '文字内容');
                            }
                            document.body.removeChild(tempDiv);
                        }, 100);
                    } catch (e) {
                        console.error('手动绘制失败:', e);
                        if (retryCount < maxRetries) {
                            retryCount++;
                            setTimeout(checkQRCode, 200);
                        } else {
                            createCanvasDirectly(qrcode._oQRCode, '文字内容');
                            document.body.removeChild(tempDiv);
                        }
                    }
                } else if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(checkQRCode, 200);
                } else {
                    console.error('生成二维码超时，尝试直接绘制');
                    createCanvasDirectly(qrcode._oQRCode, '文字内容');
                    document.body.removeChild(tempDiv);
                }
            }
        };
        
        setTimeout(checkQRCode, 100);
        
    } catch (error) {
        console.error('生成二维码失败:', error);
        showToast('生成二维码失败，请重试', 'error');
    }
}

// 处理图片上传
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件大小 (限制为5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('图片文件过大，请选择小于5MB的文件', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentImageData = e.target.result;
        
        // 显示预览
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `
            <img src="${currentImageData}" alt="图片预览" class="preview-image">
            <div class="file-info">
                <strong>文件名:</strong> ${file.name}<br>
                <strong>大小:</strong> ${formatFileSize(file.size)}<br>
                <strong>类型:</strong> ${file.type}
            </div>
        `;
        
        // 启用生成按钮
        document.getElementById('imageBtn').disabled = false;
        showToast('图片上传成功');
    };
    
    reader.onerror = function() {
        showToast('图片读取失败，请重试', 'error');
    };
    
    reader.readAsDataURL(file);
}

// 生成图片二维码
function generateImageQR() {
    if (!currentImageData) {
        showToast('请先选择图片文件', 'warning');
        return;
    }
    
    try {
        // 检查数据大小 - Base64图片数据通常很大，超出二维码容量
        console.log('图片数据长度:', currentImageData.length);
        
        // 二维码的数据容量限制：实际约2300字符以下
        // Base64图片通常很大，几乎不可能直接编码
        if (currentImageData.length > 2000) {
            // 创建简洁的图片文件信息
            const file = document.getElementById('imageInput').files[0];
            
            // 简洁格式，避免JSON过长
            const imageInfoText = `图片文件信息:
文件名: ${file.name}
大小: ${formatFileSize(file.size)}
类型: ${file.type}
上传时间: ${new Date().toLocaleString()}

提示: 图片数据过大无法直接生成二维码
建议: 上传到图床获取链接后在文字框生成二维码`;
            
            console.log('图片信息长度:', imageInfoText.length);
            
            // 再次检查长度，如果还是太长就进一步简化
            if (imageInfoText.length > 2000) {
                const simpleInfo = `图片: ${file.name}
大小: ${formatFileSize(file.size)}
建议: 上传图床获取链接`;
                
                console.log('简化信息长度:', simpleInfo.length);
                showToast('图片数据过大，已生成简化信息二维码', 'info');
                return generateQRFromText(simpleInfo, '图片信息');
            }
            
            showToast('图片数据过大，已转换为文件信息二维码', 'info');
            console.log('图片信息:', imageInfoText);
            
            // 使用图片信息生成二维码
            return generateQRFromText(imageInfoText, '图片信息');
        }
        
        // 创建临时div容器
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        // 使用QRCodeJS库生成二维码
        const qrcode = new QRCode(tempDiv, {
            text: currentImageData,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L // 使用低级别纠错，因为数据量大
        });
        
        // 等待二维码生成完成
        let retryCount = 0;
        const maxRetries = 10;
        
        const checkQRCode = () => {
            const canvas = tempDiv.querySelector('canvas');
            const img = tempDiv.querySelector('img');
            
            if (canvas || (img && img.src && img.src !== '')) {
                console.log('找到图片二维码元素，直接复制HTML内容');
                
                // 直接复制临时容器的HTML内容到显示容器
                displayQRCodeFromHTML(tempDiv.innerHTML, '图片内容');
                showToast('图片二维码生成成功！');
                
                // 清理临时元素
                document.body.removeChild(tempDiv);
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(checkQRCode, 200);
            } else {
                console.error('生成图片二维码超时');
                showToast('生成图片二维码超时，请重试', 'error');
                document.body.removeChild(tempDiv);
            }
        };
        
        setTimeout(checkQRCode, 100);
        
    } catch (error) {
        console.error('生成图片二维码失败:', error);
        if (error.message && error.message.includes('data too long')) {
            showToast('图片数据过大，请选择更小的图片文件', 'error');
        } else {
            showToast('生成图片二维码失败，请重试', 'error');
        }
    }
}

// 处理视频上传
function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件大小 (限制为10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('视频文件过大，请选择小于10MB的文件', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentVideoData = e.target.result;
        
        // 显示预览
        const preview = document.getElementById('videoPreview');
        preview.innerHTML = `
            <video src="${currentVideoData}" controls class="preview-video"></video>
            <div class="file-info">
                <strong>文件名:</strong> ${file.name}<br>
                <strong>大小:</strong> ${formatFileSize(file.size)}<br>
                <strong>类型:</strong> ${file.type}
            </div>
        `;
        
        // 启用生成按钮
        document.getElementById('videoBtn').disabled = false;
        showToast('视频上传成功');
    };
    
    reader.onerror = function() {
        showToast('视频读取失败，请重试', 'error');
    };
    
    reader.readAsDataURL(file);
}

// 生成视频二维码
function generateVideoQR() {
    if (!currentVideoData) {
        showToast('请先选择视频文件', 'warning');
        return;
    }
    
    try {
        // 检查数据大小 - 视频数据几乎总是过大
        console.log('视频数据长度:', currentVideoData.length);
        
        // 视频文件的Base64数据几乎总是超出二维码容量
        if (currentVideoData.length > 2000) {
            // 创建简洁的视频文件信息
            const file = document.getElementById('videoInput').files[0];
            
            // 简洁格式，避免JSON过长
            const videoInfoText = `视频文件信息:
文件名: ${file.name}
大小: ${formatFileSize(file.size)}
类型: ${file.type}
上传时间: ${new Date().toLocaleString()}

提示: 视频数据过大无法直接生成二维码
建议: 上传到视频平台获取链接后在文字框生成二维码`;
            
            console.log('视频信息长度:', videoInfoText.length);
            
            // 再次检查长度，如果还是太长就进一步简化
            if (videoInfoText.length > 2000) {
                const simpleInfo = `视频: ${file.name}
大小: ${formatFileSize(file.size)}
建议: 上传视频平台获取链接`;
                
                console.log('简化信息长度:', simpleInfo.length);
                showToast('视频数据过大，已生成简化信息二维码', 'info');
                return generateQRFromText(simpleInfo, '视频信息');
            }
            
            showToast('视频数据过大，已转换为文件信息二维码', 'info');
            console.log('视频信息:', videoInfoText);
            
            // 使用视频信息生成二维码
            return generateQRFromText(videoInfoText, '视频信息');
        }
        
        // 如果数据不太大，直接编码
        let dataToEncode = currentVideoData;
        
        // 创建临时div容器
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        // 使用QRCodeJS库生成二维码
        const qrcode = new QRCode(tempDiv, {
            text: dataToEncode,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L
        });
        
        // 等待二维码生成完成
        let retryCount = 0;
        const maxRetries = 10;
        
        const checkQRCode = () => {
            const canvas = tempDiv.querySelector('canvas');
            const img = tempDiv.querySelector('img');
            
            if (canvas || (img && img.src && img.src !== '')) {
                console.log('找到视频二维码元素，直接复制HTML内容');
                
                // 直接复制临时容器的HTML内容到显示容器
                displayQRCodeFromHTML(tempDiv.innerHTML, '视频内容');
                showToast('视频二维码生成成功！');
                
                // 清理临时元素
                document.body.removeChild(tempDiv);
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(checkQRCode, 200);
            } else {
                console.error('生成视频二维码超时');
                showToast('生成视频二维码超时，请重试', 'error');
                document.body.removeChild(tempDiv);
            }
        };
        
        setTimeout(checkQRCode, 100);
        
    } catch (error) {
        console.error('生成视频二维码失败:', error);
        if (error.message && error.message.includes('data too long')) {
            showToast('视频数据过大，建议使用云存储链接代替', 'error');
        } else {
            showToast('生成视频二维码失败，请重试', 'error');
        }
    }
}

// 显示二维码 (Canvas版本)
function displayQRCode(canvas, type) {
    const container = document.getElementById('qrCodeContainer');
    const actions = document.getElementById('qrActions');
    
    console.log('开始显示二维码，容器:', container, 'Canvas:', canvas);
    console.log('传入canvas内容检查:', canvas.toDataURL().length, '字符');
    
    // 清除之前的内容
    container.innerHTML = '';
    
    // 创建包装div
    const qrWrapper = document.createElement('div');
    qrWrapper.style.textAlign = 'center';
    qrWrapper.style.padding = '20px';
    
    // 直接使用原始canvas，不复制
    const displayCanvas = canvas;
    
    console.log('=== Canvas状态检查 ===');
    console.log('Canvas宽度:', displayCanvas.width, '高度:', displayCanvas.height);
    console.log('Canvas父元素（移动前）:', displayCanvas.parentElement);
    
    const beforeMoveDataURL = displayCanvas.toDataURL();
    console.log('移动前内容长度:', beforeMoveDataURL.length);
    console.log('移动前内容预览:', beforeMoveDataURL.substring(0, 100) + '...');
    
    // 设置显示样式
    displayCanvas.style.maxWidth = '100%';
    displayCanvas.style.height = 'auto';
    displayCanvas.style.border = '2px solid #ddd';
    displayCanvas.style.borderRadius = '12px';
    displayCanvas.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    displayCanvas.style.backgroundColor = 'white';
    
    qrWrapper.appendChild(displayCanvas);
    
    // 检查移动后的canvas状态
    console.log('Canvas父元素（移动后）:', displayCanvas.parentElement);
    const afterMoveDataURL = displayCanvas.toDataURL();
    console.log('移动后内容长度:', afterMoveDataURL.length);
    console.log('移动后内容预览:', afterMoveDataURL.substring(0, 100) + '...');
    console.log('移动前后内容是否相同:', beforeMoveDataURL === afterMoveDataURL);
    
    // 添加类型标签
    const typeLabel = document.createElement('div');
    typeLabel.style.marginTop = '15px';
    typeLabel.style.padding = '8px 16px';
    typeLabel.style.background = '#f8f9fa';
    typeLabel.style.borderRadius = '20px';
    typeLabel.style.fontSize = '0.9rem';
    typeLabel.style.color = '#666';
    typeLabel.style.display = 'inline-block';
    typeLabel.textContent = `类型: ${type}`;
    qrWrapper.appendChild(typeLabel);
    
    container.appendChild(qrWrapper);
    
    // 保存当前画布引用 (用于下载)
    currentQRCanvas = displayCanvas;
    
    // 显示操作按钮
    actions.style.display = 'flex';
    
    console.log('=== 最终状态检查 ===');
    console.log('当前canvas:', currentQRCanvas);
    console.log('最终内容长度:', currentQRCanvas.toDataURL().length);
    console.log('二维码显示完成');
}

// 显示二维码 (图片版本)
function displayQRCodeFromImg(img, type) {
    const container = document.getElementById('qrCodeContainer');
    const actions = document.getElementById('qrActions');
    
    // 清除之前的内容
    container.innerHTML = '';
    
    console.log('显示图片二维码:', img, '图片src:', img.src);
    
    // 直接显示图片，不转换为canvas
    const displayImg = img.cloneNode(true);
    displayImg.style.maxWidth = '100%';
    displayImg.style.height = 'auto';
    displayImg.style.border = '1px solid #ddd';
    displayImg.style.borderRadius = '8px';
    container.appendChild(displayImg);
    
    // 添加类型标签
    const typeLabel = document.createElement('div');
    typeLabel.style.marginTop = '10px';
    typeLabel.style.padding = '5px 10px';
    typeLabel.style.background = '#f8f9fa';
    typeLabel.style.borderRadius = '15px';
    typeLabel.style.fontSize = '0.9rem';
    typeLabel.style.color = '#666';
    typeLabel.textContent = `类型: ${type}`;
    container.appendChild(typeLabel);
    
    // 为下载功能创建canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const convertToCanvas = () => {
        canvas.width = displayImg.naturalWidth || displayImg.width || 256;
        canvas.height = displayImg.naturalHeight || displayImg.height || 256;
        ctx.drawImage(displayImg, 0, 0);
        currentQRCanvas = canvas;
    };
    
    // 等待图片加载完成再转换
    if (displayImg.complete && displayImg.naturalWidth > 0) {
        convertToCanvas();
    } else {
        displayImg.onload = convertToCanvas;
    }
    
    // 显示操作按钮
    actions.style.display = 'flex';
}

// 下载二维码
function downloadQR() {
    console.log('开始下载，当前canvas:', currentQRCanvas);
    
    if (!currentQRCanvas) {
        showToast('没有可下载的二维码', 'warning');
        return;
    }
    
    try {
        // 确保canvas有内容
        const dataURL = currentQRCanvas.toDataURL('image/png');
        console.log('Canvas数据URL长度:', dataURL.length);
        console.log('Canvas数据URL前缀:', dataURL.substring(0, 50));
        
        if (dataURL === 'data:,' || dataURL.length < 100) {
            throw new Error('Canvas内容为空');
        }
        
        const link = document.createElement('a');
        link.download = `qrcode_${Date.now()}.png`;
        link.href = dataURL;
        
        // 确保链接添加到DOM中
        document.body.appendChild(link);
        link.click();
        
        // 延迟移除链接
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
        
        showToast('二维码下载成功！');
    } catch (error) {
        console.error('下载失败:', error);
        showToast(`下载失败: ${error.message}`, 'error');
    }
}

// 清除二维码
function clearQR() {
    const container = document.getElementById('qrCodeContainer');
    const actions = document.getElementById('qrActions');
    
    container.innerHTML = `
        <div class="empty-state">
            <div class="qr-placeholder">📱</div>
            <p>请选择内容类型并生成二维码</p>
        </div>
    `;
    
    actions.style.display = 'none';
    currentQRCanvas = null;
    
    showToast('二维码已清除');
}

// 直接创建canvas绘制二维码
function createCanvasDirectly(qrCodeData, type) {
    if (!qrCodeData) {
        showToast('二维码数据无效', 'error');
        return;
    }
    
    console.log('直接创建canvas绘制二维码:', qrCodeData);
    
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const moduleCount = qrCodeData.getModuleCount();
        const cellSize = 8; // 每个模块的像素大小
        const margin = 20; // 边距
        
        canvas.width = moduleCount * cellSize + margin * 2;
        canvas.height = moduleCount * cellSize + margin * 2;
        
        // 填充白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制二维码模块
        ctx.fillStyle = '#000000';
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (qrCodeData.isDark(row, col)) {
                    ctx.fillRect(
                        col * cellSize + margin,
                        row * cellSize + margin,
                        cellSize,
                        cellSize
                    );
                }
            }
        }
        
        displayQRCode(canvas, type);
        showToast(`${type}二维码生成成功！`);
        
    } catch (error) {
        console.error('直接绘制二维码失败:', error);
        showToast('绘制二维码失败，请重试', 'error');
    }
}

// 格式化文件大小
// 通用的文字二维码生成函数
function generateQRFromText(text, type) {
    try {
        // 检查文本长度，确保不超过二维码容量限制
        console.log(`生成${type}二维码，文本长度:`, text.length);
        
        if (text.length > 2200) {
            // 如果文本仍然过长，创建超级简化版本
            const simpleText = `${type}文件过大\n建议使用云存储链接\n时间: ${new Date().toLocaleString()}`;
            console.log('文本过长，使用简化版本，长度:', simpleText.length);
            
            if (simpleText.length > 2200) {
                showToast(`${type}信息过长，无法生成二维码`, 'error');
                return;
            }
            text = simpleText;
        }
        
        // 创建临时div容器
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        // 使用QRCodeJS库生成二维码，使用L级纠错减少数据量
        const qrcode = new QRCode(tempDiv, {
            text: text,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L // 使用最低纠错级别以容纳更多数据
        });
        
        // 等待二维码生成完成
        let retryCount = 0;
        const maxRetries = 10;
        
        const checkQRCode = () => {
            const canvas = tempDiv.querySelector('canvas');
            const img = tempDiv.querySelector('img');
            
            if (canvas || (img && img.src && img.src !== '')) {
                console.log('找到二维码元素，直接复制HTML内容');
                
                // 直接复制临时容器的HTML内容到显示容器
                displayQRCodeFromHTML(tempDiv.innerHTML, type);
                showToast(`${type}二维码生成成功！`);
                
                // 清理临时元素
                document.body.removeChild(tempDiv);
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(checkQRCode, 200);
            } else {
                console.error('生成二维码超时');
                showToast('生成二维码超时，请重试', 'error');
                document.body.removeChild(tempDiv);
            }
        };
        
        setTimeout(checkQRCode, 100);
        
    } catch (error) {
        console.error('生成二维码失败:', error);
        showToast('生成二维码失败，请重试', 'error');
    }
}

// 直接从HTML内容显示二维码
function displayQRCodeFromHTML(htmlContent, type) {
    try {
        console.log('直接设置HTML内容:', htmlContent);
        
        const container = document.getElementById('qrCodeContainer');
        container.innerHTML = htmlContent;
        
        // 查找生成的canvas元素并设置为当前canvas用于下载
        const canvas = container.querySelector('canvas');
        if (canvas) {
            currentQRCanvas = canvas;
            console.log('设置下载canvas成功，尺寸:', canvas.width, 'x', canvas.height);
        }
        
        // 显示结果区域
        document.getElementById('resultSection').style.display = 'block';
        document.getElementById('qrTypeInfo').textContent = type;
        
        console.log('HTML内容设置完成');
    } catch (error) {
        console.error('显示HTML二维码失败:', error);
        showToast('显示二维码失败', 'error');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 为文本框添加回车键快捷生成
    document.getElementById('textInput').addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            generateTextQR();
        }
    });
    
    // 添加拖拽上传功能
    setupDragAndDrop();
});

// 设置拖拽上传
function setupDragAndDrop() {
    const imageCard = document.querySelector('.input-card:nth-child(2)');
    const videoCard = document.querySelector('.input-card:nth-child(3)');
    
    // 图片拖拽
    setupCardDragDrop(imageCard, 'image', handleImageUpload);
    // 视频拖拽
    setupCardDragDrop(videoCard, 'video', handleVideoUpload);
}

function setupCardDragDrop(card, type, handler) {
    card.addEventListener('dragover', function(e) {
        e.preventDefault();
        card.style.backgroundColor = '#f0f8ff';
        card.style.borderColor = '#667eea';
    });
    
    card.addEventListener('dragleave', function(e) {
        e.preventDefault();
        card.style.backgroundColor = '';
        card.style.borderColor = '';
    });
    
    card.addEventListener('drop', function(e) {
        e.preventDefault();
        card.style.backgroundColor = '';
        card.style.borderColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const isValidType = type === 'image' ? 
                file.type.startsWith('image/') : 
                file.type.startsWith('video/');
            
            if (isValidType) {
                const input = type === 'image' ? 
                    document.getElementById('imageInput') : 
                    document.getElementById('videoInput');
                
                // 创建文件列表
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                
                // 触发处理函数
                handler({ target: { files: [file] } });
            } else {
                showToast(`请拖拽有效的${type === 'image' ? '图片' : '视频'}文件`, 'warning');
            }
        }
    });
} 