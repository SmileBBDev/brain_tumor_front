import Swal from 'sweetalert2';

let is403AlertOpen = false;

export function show403Alert() {
  if (is403AlertOpen) return;

  is403AlertOpen = true;

  Swal.fire({
    icon: 'warning',
    title: '접근 권한 없음',
    text: '이 메뉴에 접근할 권한이 없습니다.',
    width: 360,
    padding: '1.25rem',
    confirmButtonText: '확인',
    confirmButtonColor: '#1d4ed8',
  }).finally(() => {
    is403AlertOpen = false;
  });
}
