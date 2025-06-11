window.addEventListener('DOMContentLoaded', function () {
  // 配置广告信息
  const ads = [
    {
      position: 'left-ad',
      imgSrc: '', // 👈 左侧广告为空时不显示
      link: ''
    },
    {
      position: 'right-ad',
      imgSrc: 'https://via.placeholder.com/120x270?text=广告B',
      link: 'https://example.com'
    }
  ];

  // 创建广告容器
  const wrapper = document.createElement('div');
  wrapper.id = 'adWrapper';

  let hasAd = false;

  // 添加每个广告
  ads.forEach(({ position, imgSrc, link }) => {
    if (imgSrc && link) {
      const adElement = createAd(position, imgSrc, link);
      wrapper.appendChild(adElement);
      hasAd = true;
    }
  });

  // 有广告时才添加到页面
  if (hasAd) {
    document.body.appendChild(wrapper);
  }
});

/**
 * 创建单个广告元素
 */
function createAd(positionClass, imgSrc, link) {
  const container = document.createElement('div');
  container.className = `side-ad ${positionClass}`;

  const content = document.createElement('div');
  content.className = 'ad-content';

  const a = document.createElement('a');
  a.href = link;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  const img = document.createElement('img');
  img.src = imgSrc;
  img.alt = '广告';

  const closeBtn = document.createElement('div');
  closeBtn.className = 'ad-close';
  closeBtn.innerText = '×';
  closeBtn.title = '关闭广告';
  closeBtn.onclick = () => container.remove();

  a.appendChild(img);
  content.appendChild(a);
  content.appendChild(closeBtn);
  container.appendChild(content);

  return container;
}
