import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

function CustomDialog({ open, handleClose }) {
    return (
        <Dialog
            open={open}
            onClose={() => handleClose(false)}
            fullWidth={false}
            maxWidth="sm"
            PaperProps={{
                sx: {
                    position: 'absolute',
                    top: '45%',
                    left: '60%', 
                    transform: 'translate(-50%, -50%)',
                    padding: 2,
                    borderRadius: 2,
                }
            }}
        >
            <DialogTitle></DialogTitle>
            <DialogContent>
                <DialogContentText>
                    The Brute Force and Dynamic Programming algorithms are very slow for more than 9 cities.
                    <br />
                    Do you want to continue with only 9 randomly selected cities?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => handleClose(false)} color="primary">
                    Cancel
                </Button>
                <Button onClick={() => handleClose(true)} color="primary" autoFocus>
                    Ok
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default CustomDialog;
