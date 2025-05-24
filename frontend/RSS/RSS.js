document.getElementById('copyBtn').addEventListener('click', () => {
  const rssLink = document.getElementById('rssLink');
  rssLink.select();
  rssLink.setSelectionRange(0, 99999); // For mobile
  navigator.clipboard.writeText(rssLink.value).then(() => {
    alert('Link RSS copiat în clipboard!');
  });
});