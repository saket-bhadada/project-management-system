import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function CurrentStatus() {
    const [apply, setApply] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadApply() {
            try {
                setLoading(true);
                const response = await fetch(`/api/apply`);

                if (response.status === 401 || response.status === 403) {
                    navigate('/login');
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Failed to load applications: ${response.status}`);
                }

                const data = await response.json();
                setApply(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
                setError(err.message || 'Unknown error');
            } finally {
                setLoading(false);
            }
        }

        loadApply();
    }, [navigate]);

    if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
    if (error) return <div style={{ padding: "20px", color: "red" }}>Error: {error}</div>;

    return (
        <>
            <h3>Application Status</h3>
            {apply.length === 0 ? (
                <div style={{ padding: "20px" }}>You have not applied yet</div>
            ) : (
                apply.map((apl) => (
                    <div key={apl.id} style={{ padding: "15px", border: "1px solid #ddd", marginBottom: "10px", borderRadius: "4px" }}>
                        <div><strong>Message:</strong> {apl.message_text}</div>
                        <div><strong>Email:</strong> {apl.email}</div>
                        <div><strong>Status:</strong> <span style={{ fontWeight: "bold", color: apl.status === "approved" ? "green" : apl.status === "rejected" ? "red" : "orange" }}>{apl.status}</span></div>
                    </div>
                ))
            )}
        </>
    );
}

export default CurrentStatus;