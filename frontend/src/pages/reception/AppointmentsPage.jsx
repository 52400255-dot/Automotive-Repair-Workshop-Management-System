import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import Plate from '../../components/common/Plate';
import RepairOrderCode from '../../components/common/RepairOrderCode';

const formatDate = (value) => new Date(value).toLocaleString('vi-VN');
const statusLabels = { pending: 'Chờ xử lý', proposed: 'Chờ khách phản hồi', confirmed: 'Đã xác nhận', converted: 'Đã tiếp nhận', declined: 'Từ chối', cancelled: 'Đã hủy' };
const localInputValue = (value) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [proposalTime, setProposalTime] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [checkInRequest, setCheckInRequest] = useState('');
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get('/appointments');
      setAppointments(response.data.data || []);
      setFeedback(null);
    } catch (err) { setFeedback({ error: true, text: err.response?.data?.message || 'Không tải được lịch hẹn.' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    async function initialLoad() {
      try {
        const response = await api.get('/appointments');
        if (active) setAppointments(response.data.data || []);
      } catch (err) {
        if (active) setFeedback({ error: true, text: err.response?.data?.message || 'Không tải được lịch hẹn.' });
      } finally { if (active) setLoading(false); }
    }
    initialLoad();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => { load(); }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  function openProposal(appointment) {
    setActiveId(appointment.id);
    setProposalTime(localInputValue(appointment.requested_for));
    setStaffNote('');
    setCheckInRequest(appointment.customer_request);
  }

  async function decide(appointment, status) {
    setBusyId(appointment.id);
    setFeedback(null);
    try {
      await api.put(`/appointments/${appointment.id}/decision`, {
        status,
        confirmedFor: status === 'declined' ? undefined : new Date(proposalTime || appointment.requested_for).toISOString(),
        staffNote,
      });
      setFeedback({ error: false, text: status === 'confirmed' ? 'Đã xác nhận giờ khách yêu cầu.' : status === 'proposed' ? 'Đã gửi giờ đề xuất cho khách.' : 'Đã từ chối yêu cầu đặt lịch.' });
      setActiveId(null);
      await load();
    } catch (err) { setFeedback({ error: true, text: err.response?.data?.message || 'Không xử lý được lịch hẹn.' }); }
    finally { setBusyId(null); }
  }

  async function checkIn(appointment) {
    setBusyId(appointment.id);
    setFeedback(null);
    try {
      const response = await api.post(`/appointments/${appointment.id}/check-in`, { customerRequest: checkInRequest });
      setFeedback({ error: false, text: `Đã tiếp nhận xe và tạo phiếu #${response.data.data.id}.` });
      setActiveId(null);
      await load();
    } catch (err) { setFeedback({ error: true, text: err.response?.data?.message || 'Không tiếp nhận được xe từ lịch hẹn.' }); }
    finally { setBusyId(null); }
  }

  return (
    <div className="appointments-page">
      <div className="page-header"><div><p className="eyebrow">TIẾP NHẬN & ĐIỀU PHỐI</p><h1>Lịch hẹn tiếp nhận</h1><p>Xác nhận giờ hẹn hoặc đề xuất thời gian khác; chỉ tiếp nhận thành phiếu khi khách đã xác nhận.</p></div></div>
      {feedback && <div className={`alert ${feedback.error ? 'alert-error' : 'alert-success'}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</div>}
      <section className="appointment-queue">
        <div className="table-wrapper"><table><thead><tr><th>Khách / Xe</th><th>Khách mong muốn</th><th>Tình trạng xe</th><th>Trạng thái</th><th>Giờ gara chốt</th><th>Thao tác</th></tr></thead><tbody>
          {appointments.map((appointment) => <tr key={appointment.id}><td><strong>{appointment.customer_name}</strong><div><Plate value={appointment.license_plate} /> · {appointment.brand} {appointment.model}</div><small>{appointment.customer_phone}</small></td><td>{formatDate(appointment.requested_for)}</td><td className="appointment-request-copy">{appointment.customer_request}</td><td><span className={`badge ${appointment.status === 'confirmed' ? 'badge-completed' : appointment.status === 'pending' || appointment.status === 'proposed' ? 'badge-approval' : 'badge-pending'}`}>{statusLabels[appointment.status]}</span></td><td>{appointment.confirmed_for ? formatDate(appointment.confirmed_for) : '—'}</td><td><div className="appointment-action-list">{appointment.status === 'pending' && <><button className="btn btn-primary" type="button" onClick={() => { setProposalTime(localInputValue(appointment.requested_for)); setStaffNote(''); setActiveId(activeId === appointment.id ? null : appointment.id); }}>Xác nhận / đề xuất</button><button className="btn btn-outline" type="button" disabled={busyId === appointment.id} onClick={() => decide(appointment, 'declined')}>Từ chối</button></>}{appointment.status === 'confirmed' && <button className="btn btn-primary" type="button" onClick={() => openProposal(appointment)}>Tiếp nhận xe</button>}{appointment.status === 'converted' && <span>Phiếu <RepairOrderCode id={appointment.repair_job_id} /></span>}</div></td></tr>)}
          {!loading && !appointments.length && <tr><td colSpan="6" className="dashboard-empty-cell">Không có lịch hẹn đang chờ xử lý.</td></tr>}
          {loading && <tr><td colSpan="6" className="dashboard-empty-cell">Đang tải lịch hẹn...</td></tr>}
        </tbody></table></div>
      </section>
      {activeId && appointments.find((item) => item.id === activeId)?.status !== 'confirmed' && <section className="appointment-action-panel"><div><p className="eyebrow">PHẢN HỒI KHÁCH HÀNG</p><h2>Xác nhận hoặc đề xuất giờ khác</h2></div><div className="appointment-decision-form"><div className="form-group"><label htmlFor="appointment-proposal-time">Giờ tiếp nhận</label><input id="appointment-proposal-time" className="form-control" type="datetime-local" step="1800" value={proposalTime} onChange={(e) => setProposalTime(e.target.value)} required /></div><div className="form-group"><label htmlFor="appointment-staff-note">Ghi chú gửi khách</label><input id="appointment-staff-note" className="form-control" maxLength="500" value={staffNote} onChange={(e) => setStaffNote(e.target.value)} placeholder="Không bắt buộc" /></div><div className="appointment-panel-actions"><button className="btn btn-outline" type="button" onClick={() => setActiveId(null)}>Đóng</button><button className="btn btn-outline" type="button" disabled={busyId === activeId} onClick={() => decide(appointments.find((item) => item.id === activeId), 'proposed')}>Gửi giờ đề xuất</button><button className="btn btn-primary" type="button" disabled={busyId === activeId} onClick={() => decide(appointments.find((item) => item.id === activeId), 'confirmed')}>Xác nhận giờ này</button></div></div></section>}
      {activeId && appointments.find((item) => item.id === activeId)?.status === 'confirmed' && <section className="appointment-action-panel"><div><p className="eyebrow">KHÁCH ĐÃ ĐẾN GARA</p><h2>Tiếp nhận thành phiếu sửa chữa</h2><p>Hành động này tạo phiếu sửa chữa một lần và đánh dấu lịch hẹn đã tiếp nhận.</p></div><div className="form-group"><label htmlFor="appointment-checkin-request">Yêu cầu sửa chữa đã xác nhận</label><textarea id="appointment-checkin-request" className="form-control" minLength="1" maxLength="1000" value={checkInRequest} onChange={(e) => setCheckInRequest(e.target.value)} required /></div><div className="appointment-panel-actions"><button className="btn btn-outline" type="button" onClick={() => setActiveId(null)}>Đóng</button><button className="btn btn-primary" type="button" disabled={busyId === activeId || !checkInRequest.trim()} onClick={() => checkIn(appointments.find((item) => item.id === activeId))}>{busyId === activeId ? 'Đang tiếp nhận...' : 'Tạo phiếu tiếp nhận'}</button></div></section>}
    </div>
  );
}
