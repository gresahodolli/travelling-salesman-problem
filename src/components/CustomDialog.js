import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

function CustomDialog({ open, handleClose }) {
    return (
        <Dialog open={open} onClose={() => handleClose(false)}>
            <DialogTitle></DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Algoritmet Brute Force dhe Dynamic Programming janë shumë të ngadalta për më shumë se 9 qytete.
                    A dëshiron të vazhdosh me vetëm 9 qytete të zgjedhura rastësisht?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => handleClose(false)} color="primary">
                    Anulo
                </Button>
                <Button onClick={() => handleClose(true)} color="primary" autoFocus>
                    Ok
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default CustomDialog;
