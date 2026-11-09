import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  customer: 'Khách hàng',
  receptionist: 'Lễ tân',
  service_manager: 'Quản lý dịch vụ',
  mechanic: 'Thợ máy',
  warehouse_staff: 'Nhân viên kho',
  admin: 'Quản trị viên',
};

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [details, setDetails] = useState({ fullName: '', email: '', phone: '', address: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/auth/me').then(({ data }) => {
      if (!active) return;
      const item = data.data;
      setProfile(item);
      setDetails({ fullName: item.full_name, email: item.email, phone: item.phone || '', address: item.address || '' });
      updateUser(item);
    }).catch((error) => {
      if (active) setProfileMessage({ error: true, text: error.response?.data?.message || 'Không tải được thông tin tài khoản.' });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [updateUser]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setProfileMessage(null);
    try {
      const { data } = await api.patch('/auth/me', details);
      const item = data.data;
      setProfile(item);
      setDetails({ fullName: item.full_name, email: item.email, phone: item.phone || '', address: item.address || '' });
      updateUser(item);
      setProfileMessage({ error: false, text: 'Đã lưu thông tin tài khoản.' });
    } catch (error) {
      setProfileMessage({ error: true, text: error.response?.data?.message || 'Không lưu được thông tin tài khoản.' });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setPasswordMessage(null);
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMessage({ error: true, text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage({ error: false, text: 'Đã đổi mật khẩu thành công.' });
    } catch (error) {
      setPasswordMessage({ error: true, text: error.response?.data?.message || 'Không đổi được mật khẩu.' });
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Tài khoản cá nhân</p>
          <h1>Tài khoản của tôi</h1>
        </div>
      </div>
      {loading && <p role="status">Đang tải thông tin tài khoản...</p>}
      {!loading && !profile && <p className="alert alert-error" role="alert">{profileMessage?.text}</p>}
      {profile && (
        <div className="profile-layout">
          <section className="profile-section" aria-labelledby="profile-info-title">
            <div className="profile-section-heading">
              <div>
                <p className="eyebrow">Hồ sơ</p>
                <h2 id="profile-info-title">Thông tin cá nhân</h2>
              </div>
              <span className="profile-role">{ROLE_LABELS[profile.role] || profile.role}</span>
            </div>
            <form onSubmit={saveProfile}>
              <div className="profile-fields">
                <div className="form-group">
                  <label htmlFor="profile-name">Họ và tên</label>
                  <input className="form-control" id="profile-name" value={details.fullName} onChange={(e) => setDetails({ ...details, fullName: e.target.value })} minLength={2} maxLength={150} required />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-email">Email đăng nhập</label>
                  <input className="form-control" id="profile-email" type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} maxLength={255} required />
                </div>
                {profile.role === 'customer' && <>
                  <div className="form-group">
                    <label htmlFor="profile-phone">Số điện thoại</label>
                    <input className="form-control" id="profile-phone" type="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} minLength={8} maxLength={20} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-address">Địa chỉ</label>
                    <input className="form-control" id="profile-address" value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} maxLength={255} />
                  </div>
                </>}
              </div>
              <div className="profile-form-footer">
                {profileMessage && <p className={`alert ${profileMessage.error ? 'alert-error' : 'alert-success'}`} role={profileMessage.error ? 'alert' : 'status'}>{profileMessage.text}</p>}
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thông tin'}</button>
              </div>
            </form>
          </section>

          <section className="profile-section" aria-labelledby="profile-password-title">
            <div className="profile-section-heading">
              <div>
                <p className="eyebrow">Bảo mật</p>
                <h2 id="profile-password-title">Đổi mật khẩu</h2>
              </div>
            </div>
            <form onSubmit={savePassword}>
              <div className="form-group">
                <label htmlFor="current-password">Mật khẩu hiện tại</label>
                <input className="form-control" id="current-password" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="new-password">Mật khẩu mới</label>
                <input className="form-control" id="new-password" type="password" autoComplete="new-password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} minLength={8} required />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
                <input className="form-control" id="confirm-password" type="password" autoComplete="new-password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} minLength={8} required />
              </div>
              <div className="profile-form-footer">
                {passwordMessage && <p className={`alert ${passwordMessage.error ? 'alert-error' : 'alert-success'}`} role={passwordMessage.error ? 'alert' : 'status'}>{passwordMessage.text}</p>}
                <button className="btn btn-primary" type="submit" disabled={changingPassword}>{changingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
